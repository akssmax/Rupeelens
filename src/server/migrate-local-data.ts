import { createServerFn } from "@tanstack/react-start"
import { requireServerSession } from "@/lib/auth/session.server"
import { normalizeTransactionDescription } from "@/lib/finance/transaction-dedupe"
import { getPgDb } from "@/lib/db/pg"
import {
  appMerchantMemory,
  appStatements,
  appTransactions,
  appUserSettings,
} from "@/lib/db/schema"
import type { MerchantMemory, Statement, Transaction } from "@/lib/types"

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

    if (data.transactions.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < data.transactions.length; i += chunkSize) {
        const chunk = data.transactions.slice(i, i + chunkSize)
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
      transactions: data.transactions.length,
    }
  })
