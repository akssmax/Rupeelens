import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray, sql } from "drizzle-orm"
import { requireServerSession } from "@/lib/auth/session.server"
import {
  mergeCategories,
  pickCustomCategoryColor,
  slugifyCategoryName,
} from "@/lib/categories"
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
import type {
  AppSettings,
  BankId,
  Category,
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
    description: normalizeTransactionDescription(row.description),
    debit: num(row.debit),
    credit: num(row.credit),
    amount: num(row.amount),
    balance: row.balance != null ? num(row.balance) : undefined,
    bankRef: row.bankRef ?? undefined,
    categoryId: row.categoryId as CategoryId,
    categorySource:
      (row.categorySource as Transaction["categorySource"]) ?? undefined,
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
          customCategories: (settingsRow[0].customCategories as Category[] | null) ?? [],
        }
      : {
          id: "settings",
          currency: "INR",
          mistralModel: "mistral-small-latest",
          customCategories: [],
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
      categories: mergeCategories(settings.customCategories ?? []),
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

    const [existingStatement] = await db
      .select({ userId: appStatements.userId })
      .from(appStatements)
      .where(eq(appStatements.id, data.statement.id))
      .limit(1)

    if (existingStatement && existingStatement.userId !== user.id) {
      throw new Error("Unauthorized")
    }

    const existingTransactions = await db
      .select()
      .from(appTransactions)
      .where(eq(appTransactions.userId, user.id))

    const { unique: toInsert, skippedDuplicates } = partitionNewTransactions(
      data.transactions,
      existingTransactions.map(rowToTransaction),
    )

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
        rowCount: String(toInsert.length),
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
          rowCount: String(toInsert.length),
        },
        where: eq(appStatements.userId, user.id),
      })

    if (toInsert.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
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

    return {
      inserted: toInsert.length,
      skippedDuplicates,
    }
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
        ...(patch.categorySource !== undefined
          ? { categorySource: patch.categorySource ?? null }
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
    if (data.updates.length === 0) return
    const { user } = await requireServerSession()
    const db = getPgDb()

    const buildPatch = (patch: Partial<Transaction>) => ({
      ...(patch.date != null ? { date: patch.date } : {}),
      ...(patch.valueDate !== undefined ? { valueDate: patch.valueDate } : {}),
      ...(patch.description != null ? { description: patch.description } : {}),
      ...(patch.debit != null ? { debit: String(patch.debit) } : {}),
      ...(patch.credit != null ? { credit: String(patch.credit) } : {}),
      ...(patch.amount != null ? { amount: String(patch.amount) } : {}),
      ...(patch.balance !== undefined
        ? { balance: patch.balance != null ? String(patch.balance) : null }
        : {}),
      ...(patch.bankRef !== undefined ? { bankRef: patch.bankRef } : {}),
      ...(patch.categoryId != null ? { categoryId: patch.categoryId } : {}),
      ...(patch.categorySource !== undefined
        ? { categorySource: patch.categorySource ?? null }
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

    const chunkSize = 100
    for (let i = 0; i < data.updates.length; i += chunkSize) {
      const chunk = data.updates.slice(i, i + chunkSize)
      await Promise.all(
        chunk.map(({ id, patch }) =>
          db
            .update(appTransactions)
            .set(buildPatch(patch))
            .where(
              and(eq(appTransactions.id, id), eq(appTransactions.userId, user.id)),
            ),
        ),
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

    const keys = [...new Set(data.entries.map((entry) => entry.merchantKey))]
    const existingRows = keys.length
      ? await db
          .select()
          .from(appMerchantMemory)
          .where(
            and(
              eq(appMerchantMemory.userId, user.id),
              inArray(appMerchantMemory.merchantKey, keys),
            ),
          )
      : []
    const existingByKey = new Map(
      existingRows.map((row) => [row.merchantKey, row]),
    )

    const merged = new Map<
      string,
      {
        merchantKey: string
        categoryId: CategoryId
        merchantName?: string
        isSubscription?: boolean
        source?: MerchantMemory["source"]
      }
    >()

    for (const entry of data.entries) {
      const existing = existingByKey.get(entry.merchantKey)
      if (existing?.source === "user" && entry.source !== "user") continue

      merged.set(entry.merchantKey, {
        merchantKey: entry.merchantKey,
        categoryId: entry.categoryId,
        merchantName: entry.merchantName ?? existing?.merchantName ?? undefined,
        isSubscription:
          entry.isSubscription ?? existing?.isSubscription ?? undefined,
        source:
          existing?.source === "user"
            ? "user"
            : ((entry.source ??
                (existing?.source as MerchantMemory["source"] | undefined)) ??
              undefined),
      })
    }

    const rows = [...merged.values()]
    if (rows.length === 0) return

    const chunkSize = 100
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      await db
        .insert(appMerchantMemory)
        .values(
          chunk.map((entry) => ({
            userId: user.id,
            merchantKey: entry.merchantKey,
            categoryId: entry.categoryId,
            updatedAt: now,
            merchantName: entry.merchantName,
            isSubscription: entry.isSubscription,
            source: entry.source,
          })),
        )
        .onConflictDoUpdate({
          target: [appMerchantMemory.userId, appMerchantMemory.merchantKey],
          set: {
            categoryId: sql`CASE WHEN ${appMerchantMemory.source} = 'user' THEN ${appMerchantMemory.categoryId} ELSE excluded.category_id END`,
            updatedAt: now,
            merchantName: sql`COALESCE(excluded.merchant_name, ${appMerchantMemory.merchantName})`,
            isSubscription: sql`COALESCE(excluded.is_subscription, ${appMerchantMemory.isSubscription})`,
            source: sql`CASE WHEN ${appMerchantMemory.source} = 'user' THEN ${appMerchantMemory.source} ELSE excluded.source END`,
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
      .select()
      .from(appTransactions)
      .where(eq(appTransactions.userId, user.id))

    const { unique, skippedDuplicates } = partitionNewTransactions(
      data.candidates,
      existing.map(rowToTransaction),
    )

    return { transactions: unique, skippedDuplicates }
  })

export const fetchCloudCategories = createServerFn({ method: "POST" }).handler(
  async () => {
    const { user } = await requireServerSession()
    const db = getPgDb()
    const settingsRow = await db
      .select()
      .from(appUserSettings)
      .where(eq(appUserSettings.userId, user.id))
      .limit(1)

    const customCategories =
      (settingsRow[0]?.customCategories as Category[] | null) ?? []
    return { categories: mergeCategories(customCategories) }
  },
)

export const createCloudCategory = createServerFn({ method: "POST" })
  .validator((data: { name: string; color?: string }) => data)
  .handler(async ({ data }) => {
    const trimmed = data.name.trim()
    if (!trimmed) throw new Error("Category name is required")

    const { user } = await requireServerSession()
    const db = getPgDb()
    const settingsRow = await db
      .select()
      .from(appUserSettings)
      .where(eq(appUserSettings.userId, user.id))
      .limit(1)

    const existingCustom =
      (settingsRow[0]?.customCategories as Category[] | null) ?? []

    let id = slugifyCategoryName(trimmed)
    let suffix = 2
    while (existingCustom.some((c) => c.id === id)) {
      id = `${slugifyCategoryName(trimmed)}_${suffix}`
      suffix += 1
    }

    const category: Category = {
      id,
      name: trimmed,
      color: data.color ?? pickCustomCategoryColor(existingCustom.length),
      custom: true,
    }

    const nextCustom = [...existingCustom, category]

    await db
      .insert(appUserSettings)
      .values({
        userId: user.id,
        currency: "INR",
        mistralModel: settingsRow[0]?.mistralModel ?? "mistral-small-latest",
        customCategories: nextCustom,
      })
      .onConflictDoUpdate({
        target: appUserSettings.userId,
        set: { customCategories: nextCustom },
      })

    return { category, categories: mergeCategories(nextCustom) }
  })
