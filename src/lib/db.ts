import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import {
  pickCustomCategoryColor,
  SEED_CATEGORIES,
  slugifyCategoryName,
  sortCategories,
} from "./categories"
import { partitionNewTransactions } from "./finance/transaction-dedupe"
import type {
  AppSettings,
  Category,
  CategoryId,
  MerchantMemory,
  Statement,
  Transaction,
} from "./types"

interface FinanceDB extends DBSchema {
  statements: {
    key: string
    value: Statement
    indexes: { "by-period": string }
  }
  transactions: {
    key: string
    value: Transaction
    indexes: {
      "by-statement": string
      "by-date": string
      "by-category": string
      "by-merchant": string
    }
  }
  categories: {
    key: string
    value: Category
  }
  merchantMemory: {
    key: string
    value: MerchantMemory
  }
  settings: {
    key: string
    value: AppSettings
  }
}

const DB_NAME = "personal-finance"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null

export function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available")
  }
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const statements = db.createObjectStore("statements", { keyPath: "id" })
        statements.createIndex("by-period", "periodStart")

        const txs = db.createObjectStore("transactions", { keyPath: "id" })
        txs.createIndex("by-statement", "statementId")
        txs.createIndex("by-date", "date")
        txs.createIndex("by-category", "categoryId")
        txs.createIndex("by-merchant", "merchant")

        db.createObjectStore("categories", { keyPath: "id" })
        db.createObjectStore("merchantMemory", { keyPath: "merchantKey" })
        db.createObjectStore("settings", { keyPath: "id" })
      },
    }).then(async (db) => {
      await seedIfNeeded(db)
      return db
    })
  }
  return dbPromise
}

async function seedIfNeeded(db: IDBPDatabase<FinanceDB>) {
  await ensureBuiltinCategories(db)
  const settings = await db.get("settings", "settings")
  if (!settings) {
    await db.put("settings", {
      id: "settings",
      currency: "INR",
      mistralModel: "mistral-small-latest",
    })
  }
}

async function ensureBuiltinCategories(db: IDBPDatabase<FinanceDB>) {
  const existing = await db.getAll("categories")
  const existingIds = new Set(existing.map((c) => c.id))
  if (existing.length === 0) {
    const tx = db.transaction("categories", "readwrite")
    await Promise.all([
      ...SEED_CATEGORIES.map((c) => tx.store.put(c)),
      tx.done,
    ])
    return
  }
  const missing = SEED_CATEGORIES.filter((c) => !existingIds.has(c.id))
  if (missing.length === 0) return
  const tx = db.transaction("categories", "readwrite")
  await Promise.all([...missing.map((c) => tx.store.put(c)), tx.done])
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb()
  const all = await db.getAll("transactions")
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getTransactionsByMonth(
  month: string,
): Promise<Transaction[]> {
  const all = await getAllTransactions()
  return all.filter((t) => t.date.startsWith(month))
}

export async function getAllStatements(): Promise<Statement[]> {
  const db = await getDb()
  const all = await db.getAll("statements")
  return all.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb()
  await ensureBuiltinCategories(db)
  const all = await db.getAll("categories")
  return sortCategories(all)
}

export async function createCustomCategory(
  name: string,
  color?: string,
): Promise<Category> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Category name is required")

  const db = await getDb()
  await ensureBuiltinCategories(db)
  const existing = await db.getAll("categories")

  let id = slugifyCategoryName(trimmed)
  let suffix = 2
  while (existing.some((c) => c.id === id)) {
    id = `${slugifyCategoryName(trimmed)}_${suffix}`
    suffix += 1
  }

  const customCount = existing.filter((c) => c.custom).length
  const category: Category = {
    id,
    name: trimmed,
    color: color ?? pickCustomCategoryColor(customCount),
    custom: true,
  }
  await db.put("categories", category)
  return category
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const s = await db.get("settings", "settings")
  return (
    s ?? {
      id: "settings",
      currency: "INR",
      mistralModel: "mistral-small-latest",
    }
  )
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<void> {
  const db = await getDb()
  const current = await getSettings()
  await db.put("settings", { ...current, ...patch })
}

export async function getMerchantMemory(): Promise<MerchantMemory[]> {
  const db = await getDb()
  return db.getAll("merchantMemory")
}

export async function getMerchantMemoryMap(): Promise<
  Map<string, CategoryId>
> {
  const rows = await getMerchantMemory()
  return new Map(rows.map((r) => [r.merchantKey, r.categoryId]))
}

export async function getMerchantMemoryIndex(): Promise<
  Map<string, MerchantMemory>
> {
  const rows = await getMerchantMemory()
  return new Map(rows.map((r) => [r.merchantKey, r]))
}

export async function putMerchantMemory(
  merchantKey: string,
  categoryId: CategoryId,
  meta?: Pick<
    MerchantMemory,
    "merchantName" | "isSubscription" | "source"
  >,
): Promise<void> {
  const db = await getDb()
  const existing = await db.get("merchantMemory", merchantKey)
  await db.put("merchantMemory", {
    merchantKey,
    categoryId,
    updatedAt: new Date().toISOString(),
    merchantName: meta?.merchantName ?? existing?.merchantName,
    isSubscription: meta?.isSubscription ?? existing?.isSubscription,
    source: meta?.source ?? existing?.source,
  })
}

export async function putMerchantMemoryBatch(
  entries: Array<{
    merchantKey: string
    categoryId: CategoryId
    merchantName?: string
    isSubscription?: boolean
    source?: MerchantMemory["source"]
  }>,
): Promise<void> {
  if (entries.length === 0) return
  const db = await getDb()
  const tx = db.transaction("merchantMemory", "readwrite")
  const now = new Date().toISOString()
  for (const entry of entries) {
    const existing = await tx.store.get(entry.merchantKey)
    await tx.store.put({
      merchantKey: entry.merchantKey,
      categoryId: entry.categoryId,
      updatedAt: now,
      merchantName: entry.merchantName ?? existing?.merchantName,
      isSubscription: entry.isSubscription ?? existing?.isSubscription,
      source: entry.source ?? existing?.source,
    })
  }
  await tx.done
}

export async function saveImport(params: {
  statement: Statement
  transactions: Transaction[]
}): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["statements", "transactions", "settings"], "readwrite")
  await tx.objectStore("statements").put(params.statement)
  for (const t of params.transactions) {
    await tx.objectStore("transactions").put(t)
  }
  const settings = await tx.objectStore("settings").get("settings")
  await tx.objectStore("settings").put({
    ...(settings ?? {
      id: "settings" as const,
      currency: "INR" as const,
      mistralModel: "mistral-small-latest",
    }),
    lastImportAt: new Date().toISOString(),
  })
  await tx.done
}

export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>,
): Promise<void> {
  const db = await getDb()
  const existing = await db.get("transactions", id)
  if (!existing) return
  await db.put("transactions", { ...existing, ...patch, id })
}

export async function updateTransactionsBatch(
  updates: Array<{ id: string; patch: Partial<Transaction> }>,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction("transactions", "readwrite")
  for (const { id, patch } of updates) {
    const existing = await tx.store.get(id)
    if (existing) {
      await tx.store.put({ ...existing, ...patch, id })
    }
  }
  await tx.done
}

/** Deduplicate by date + normalized description + amount against existing DB rows */
export async function filterNewTransactions(
  candidates: Transaction[],
): Promise<Transaction[]> {
  const existing = await getAllTransactions()
  return partitionNewTransactions(candidates, existing).unique
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(
    ["statements", "transactions", "merchantMemory", "settings"],
    "readwrite",
  )
  await Promise.all([
    tx.objectStore("statements").clear(),
    tx.objectStore("transactions").clear(),
    tx.objectStore("merchantMemory").clear(),
    tx.objectStore("settings").put({
      id: "settings",
      currency: "INR",
      mistralModel: "mistral-small-latest",
    }),
    tx.done,
  ])
}

export { merchantKeyFromDescription } from "./merchants/keys"
