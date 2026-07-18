import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { requireServerSession } from "@/lib/auth/session.server"
import {
  normalizeTransactionDescription,
  partitionNewTransactions,
} from "@/lib/finance/transaction-dedupe"
import { getPgDb } from "@/lib/db/pg"
import {
  appMerchantMemory,
  appStatements,
  appTransactions,
  appUserSettings,
} from "@/lib/db/schema"
import type { MerchantMemory, Statement, Transaction } from "@/lib/types"

function num(value: string | number | null | undefined): number {
  if (value == null) return 0
  return typeof value === "number" ? value : Number(value)
}

function rowToTransaction(row: typeof appTransactions.$inferSelect): Transaction {
  return {
    id: row.id,
    statementId: row.statementId,
    date: row.date,
    valueDate: row.valueDate ?? undefined,
    description: row.description,
    debit: num(row.debit),
    credit: num(row.credit),
    amount: num(row.amount),
    balance: row.balance != null ? num(row.balance) : undefined,
    bankRef: row.bankRef ?? undefined,
    categoryId: row.categoryId,
    categorySource:
      (row.categorySource as Transaction["categorySource"]) ?? undefined,
    merchant: row.merchant ?? undefined,
    isSubscription: row.isSubscription ?? undefined,
    confidence: row.confidence != null ? num(row.confidence) : undefined,
    raw: (row.raw as Record<string, string> | null) ?? undefined,
  }
}

export const migrateLocalDataToCloud = createServerFn({ method: "POST" })
  .validator(
    (data: {
      statements: Statement[]
      transactions: Transaction[]
      merchantMemory: MerchantMemory[]
    }) => data,
  )
  .handler(async ({ data }) => {
    const { user } = await requireServerSession()
    const db = getPgDb()
    const now = new Date()

    const existingTransactions = await db
      .select()
      .from(appTransactions)
      .where(eq(appTransactions.userId, user.id))

    const { unique: newTransactions, skippedDuplicates } =
      partitionNewTransactions(
        data.transactions,
        existingTransactions.map(rowToTransaction),
      )

    if (data.statements.length > 0) {
      await db
        .insert(appStatements)
        .values(
          data.statements.map((statement) => ({
            id: statement.id,
            userId: user.id,
            bank: statement.bank,
            accountHint: statement.accountHint,
            periodStart: statement.periodStart,
            periodEnd: statement.periodEnd,
            uploadedAt: new Date(statement.uploadedAt),
            filename: statement.filename,
            rowCount: String(statement.rowCount),
          })),
        )
        .onConflictDoNothing()
    }

    if (newTransactions.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < newTransactions.length; i += chunkSize) {
        const chunk = newTransactions.slice(i, i + chunkSize)
        await db
          .insert(appTransactions)
          .values(
            chunk.map((tx) => ({
              id: tx.id,
              userId: user.id,
              statementId: tx.statementId,
              date: tx.date,
              valueDate: tx.valueDate,
              description: normalizeTransactionDescription(tx.description),
              debit: String(tx.debit),
              credit: String(tx.credit),
              amount: String(tx.amount),
              balance: tx.balance != null ? String(tx.balance) : null,
              bankRef: tx.bankRef,
              categoryId: tx.categoryId,
              categorySource: tx.categorySource ?? null,
              merchant: tx.merchant,
              isSubscription: tx.isSubscription,
              confidence: tx.confidence != null ? String(tx.confidence) : null,
              raw: tx.raw ?? null,
            })),
          )
          .onConflictDoNothing({
            target: [
              appTransactions.userId,
              appTransactions.date,
              appTransactions.description,
              appTransactions.amount,
            ],
          })
      }
    }

    if (data.merchantMemory.length > 0) {
      for (const memory of data.merchantMemory) {
        await db
          .insert(appMerchantMemory)
          .values({
            userId: user.id,
            merchantKey: memory.merchantKey,
            categoryId: memory.categoryId,
            updatedAt: new Date(memory.updatedAt),
            merchantName: memory.merchantName,
            isSubscription: memory.isSubscription,
            source: memory.source,
          })
          .onConflictDoUpdate({
            target: [appMerchantMemory.userId, appMerchantMemory.merchantKey],
            set: {
              categoryId: memory.categoryId,
              updatedAt: new Date(memory.updatedAt),
              merchantName: memory.merchantName,
              isSubscription: memory.isSubscription,
              source: memory.source,
            },
          })
      }
    }

    if (data.statements.length > 0 || data.transactions.length > 0) {
      await db
        .insert(appUserSettings)
        .values({
          userId: user.id,
          currency: "INR",
          mistralModel: "mistral-small-latest",
          lastImportAt: now,
        })
        .onConflictDoUpdate({
          target: appUserSettings.userId,
          set: { lastImportAt: now },
        })
    }

    return {
      ok: true as const,
      statements: data.statements.length,
      transactions: newTransactions.length,
      skippedDuplicates,
    }
  })
