import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { requireServerSession } from "@/lib/auth/session.server"
import { getPgDb } from "@/lib/db/pg"
import {
  appMerchantMemory,
  appStatements,
  appTransactions,
  appUserSettings,
} from "@/lib/db/schema"
import type {
  AppSettings,
  BankId,
  CategoryId,
  MerchantMemory,
  Statement,
  Transaction,
} from "@/lib/types"

function num(value: string | number | null | undefined): number {
  if (value == null) return 0
  return typeof value === "number" ? value : Number(value)
}

function rowToStatement(row: typeof appStatements.$inferSelect): Statement {
  return {
    id: row.id,
    bank: row.bank as BankId,
    accountHint: row.accountHint ?? undefined,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    uploadedAt: row.uploadedAt.toISOString(),
    filename: row.filename,
    rowCount: num(row.rowCount),
  }
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
    categoryId: row.categoryId as CategoryId,
    merchant: row.merchant ?? undefined,
    isSubscription: row.isSubscription ?? undefined,
    confidence: row.confidence != null ? num(row.confidence) : undefined,
    raw: (row.raw as Record<string, string> | null) ?? undefined,
  }
}

function rowToMerchantMemory(
  row: typeof appMerchantMemory.$inferSelect,
): MerchantMemory {
  return {
    merchantKey: row.merchantKey,
    categoryId: row.categoryId as CategoryId,
    updatedAt: row.updatedAt.toISOString(),
    merchantName: row.merchantName ?? undefined,
    isSubscription: row.isSubscription ?? undefined,
    source: (row.source as MerchantMemory["source"]) ?? undefined,
  }
}

export const fetchCloudFinanceData = createServerFn({ method: "POST" }).handler(
  async () => {
    const { user } = await requireServerSession()
    const db = getPgDb()

    const [statements, transactions, merchantMemory, settingsRow] =
      await Promise.all([
        db
          .select()
          .from(appStatements)
          .where(eq(appStatements.userId, user.id)),
        db
          .select()
          .from(appTransactions)
          .where(eq(appTransactions.userId, user.id)),
        db
          .select()
          .from(appMerchantMemory)
          .where(eq(appMerchantMemory.userId, user.id)),
        db
          .select()
          .from(appUserSettings)
          .where(eq(appUserSettings.userId, user.id))
          .limit(1),
      ])

    const settings: AppSettings = settingsRow[0]
      ? {
          id: "settings",
          currency: "INR",
          mistralModel: settingsRow[0].mistralModel,
          lastImportAt: settingsRow[0].lastImportAt?.toISOString(),
        }
      : {
          id: "settings",
          currency: "INR",
          mistralModel: "mistral-small-latest",
        }

    return {
      statements: statements
        .map(rowToStatement)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
      transactions: transactions
        .map(rowToTransaction)
        .sort((a, b) => b.date.localeCompare(a.date)),
      merchantMemory: merchantMemory.map(rowToMerchantMemory),
      settings,
    }
  },
)

export const saveCloudImport = createServerFn({ method: "POST" })
  .validator(
    (data: { statement: Statement; transactions: Transaction[] }) => data,
  )
  .handler(async ({ data }) => {
    const { user } = await requireServerSession()
    const db = getPgDb()
    const now = new Date()

    await db
      .insert(appStatements)
      .values({
        id: data.statement.id,
        userId: user.id,
        bank: data.statement.bank,
        accountHint: data.statement.accountHint,
        periodStart: data.statement.periodStart,
        periodEnd: data.statement.periodEnd,
        uploadedAt: new Date(data.statement.uploadedAt),
        filename: data.statement.filename,
        rowCount: String(data.statement.rowCount),
      })
      .onConflictDoUpdate({
        target: appStatements.id,
        set: {
          bank: data.statement.bank,
          accountHint: data.statement.accountHint,
          periodStart: data.statement.periodStart,
          periodEnd: data.statement.periodEnd,
          uploadedAt: new Date(data.statement.uploadedAt),
          filename: data.statement.filename,
          rowCount: String(data.statement.rowCount),
        },
      })

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
              description: tx.description,
              debit: String(tx.debit),
              credit: String(tx.credit),
              amount: String(tx.amount),
              balance: tx.balance != null ? String(tx.balance) : null,
              bankRef: tx.bankRef,
              categoryId: tx.categoryId,
              merchant: tx.merchant,
              isSubscription: tx.isSubscription,
              confidence: tx.confidence != null ? String(tx.confidence) : null,
              raw: tx.raw ?? null,
            })),
          )
          .onConflictDoNothing()
      }
    }

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
  })

export const updateCloudTransaction = createServerFn({ method: "POST" })
  .validator((data: { id: string; patch: Partial<Transaction> }) => data)
  .handler(async ({ data }) => {
    const { user } = await requireServerSession()
    const db = getPgDb()
    const patch = data.patch

    await db
      .update(appTransactions)
      .set({
        ...(patch.date != null ? { date: patch.date } : {}),
        ...(patch.valueDate !== undefined
          ? { valueDate: patch.valueDate }
          : {}),
        ...(patch.description != null
          ? { description: patch.description }
          : {}),
        ...(patch.debit != null ? { debit: String(patch.debit) } : {}),
        ...(patch.credit != null ? { credit: String(patch.credit) } : {}),
        ...(patch.amount != null ? { amount: String(patch.amount) } : {}),
        ...(patch.balance !== undefined
          ? { balance: patch.balance != null ? String(patch.balance) : null }
          : {}),
        ...(patch.bankRef !== undefined ? { bankRef: patch.bankRef } : {}),
        ...(patch.categoryId != null ? { categoryId: patch.categoryId } : {}),
        ...(patch.merchant !== undefined ? { merchant: patch.merchant } : {}),
        ...(patch.isSubscription !== undefined
          ? { isSubscription: patch.isSubscription }
          : {}),
        ...(patch.confidence !== undefined
          ? {
              confidence:
                patch.confidence != null ? String(patch.confidence) : null,
            }
          : {}),
        ...(patch.raw !== undefined ? { raw: patch.raw ?? null } : {}),
      })
      .where(
        and(
          eq(appTransactions.id, data.id),
          eq(appTransactions.userId, user.id),
        ),
      )
  })

export const updateCloudTransactionsBatch = createServerFn({ method: "POST" })
  .validator(
    (data: { updates: Array<{ id: string; patch: Partial<Transaction> }> }) =>
      data,
  )
  .handler(async ({ data }) => {
    const { user } = await requireServerSession()
    const db = getPgDb()

    for (const { id, patch } of data.updates) {
      await db
        .update(appTransactions)
        .set({
          ...(patch.date != null ? { date: patch.date } : {}),
          ...(patch.valueDate !== undefined
            ? { valueDate: patch.valueDate }
            : {}),
          ...(patch.description != null
            ? { description: patch.description }
            : {}),
          ...(patch.debit != null ? { debit: String(patch.debit) } : {}),
          ...(patch.credit != null ? { credit: String(patch.credit) } : {}),
          ...(patch.amount != null ? { amount: String(patch.amount) } : {}),
          ...(patch.balance !== undefined
            ? {
                balance:
                  patch.balance != null ? String(patch.balance) : null,
              }
            : {}),
          ...(patch.bankRef !== undefined ? { bankRef: patch.bankRef } : {}),
          ...(patch.categoryId != null
            ? { categoryId: patch.categoryId }
            : {}),
          ...(patch.merchant !== undefined ? { merchant: patch.merchant } : {}),
          ...(patch.isSubscription !== undefined
            ? { isSubscription: patch.isSubscription }
            : {}),
          ...(patch.confidence !== undefined
            ? {
                confidence:
                  patch.confidence != null ? String(patch.confidence) : null,
              }
            : {}),
          ...(patch.raw !== undefined ? { raw: patch.raw ?? null } : {}),
        })
        .where(
          and(eq(appTransactions.id, id), eq(appTransactions.userId, user.id)),
        )
    }
  })

export const upsertCloudMerchantMemoryBatch = createServerFn({ method: "POST" })
  .validator(
    (data: {
      entries: Array<{
        merchantKey: string
        categoryId: CategoryId
        merchantName?: string
        isSubscription?: boolean
        source?: MerchantMemory["source"]
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    if (data.entries.length === 0) return
    const { user } = await requireServerSession()
    const db = getPgDb()
    const now = new Date()

    for (const entry of data.entries) {
      const existing = await db
        .select()
        .from(appMerchantMemory)
        .where(
          and(
            eq(appMerchantMemory.userId, user.id),
            eq(appMerchantMemory.merchantKey, entry.merchantKey),
          ),
        )
        .limit(1)

      await db
        .insert(appMerchantMemory)
        .values({
          userId: user.id,
          merchantKey: entry.merchantKey,
          categoryId: entry.categoryId,
          updatedAt: now,
          merchantName: entry.merchantName ?? existing[0]?.merchantName,
          isSubscription:
            entry.isSubscription ?? existing[0]?.isSubscription ?? undefined,
          source: entry.source ?? existing[0]?.source ?? undefined,
        })
        .onConflictDoUpdate({
          target: [appMerchantMemory.userId, appMerchantMemory.merchantKey],
          set: {
            categoryId: entry.categoryId,
            updatedAt: now,
            merchantName: entry.merchantName ?? existing[0]?.merchantName,
            isSubscription:
              entry.isSubscription ?? existing[0]?.isSubscription ?? undefined,
            source: entry.source ?? existing[0]?.source ?? undefined,
          },
        })
    }
  })

export const filterCloudNewTransactions = createServerFn({ method: "POST" })
  .validator((data: { candidates: Transaction[] }) => data)
  .handler(async ({ data }) => {
    const { user } = await requireServerSession()
    const db = getPgDb()
    const existing = await db
      .select({
        date: appTransactions.date,
        description: appTransactions.description,
        amount: appTransactions.amount,
      })
      .from(appTransactions)
      .where(eq(appTransactions.userId, user.id))

    const keys = new Set(
      existing.map(
        (t) => `${t.date}|${t.description}|${num(t.amount).toFixed(2)}`,
      ),
    )

    return {
      transactions: data.candidates.filter(
        (t) => !keys.has(`${t.date}|${t.description}|${t.amount.toFixed(2)}`),
      ),
    }
  })
