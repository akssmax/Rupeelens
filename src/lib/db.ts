import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import { SEED_CATEGORIES } from "./categories"
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
  const count = await db.count("categories")
  if (count === 0) {
    const tx = db.transaction("categories", "readwrite")
    await Promise.all([
      ...SEED_CATEGORIES.map((c) => tx.store.put(c)),
      tx.done,
    ])
  }
  const settings = await db.get("settings", "settings")
  if (!settings) {
    await db.put("settings", {
      id: "settings",
      currency: "INR",
      mistralModel: "mistral-small-latest",
    })
  }
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
  return db.getAll("categories")
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

export async function putMerchantMemory(
  merchantKey: string,
  categoryId: CategoryId,
): Promise<void> {
  const db = await getDb()
  await db.put("merchantMemory", {
    merchantKey,
    categoryId,
    updatedAt: new Date().toISOString(),
  })
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

/** Deduplicate by date + description + amount against existing DB rows */
export async function filterNewTransactions(
  candidates: Transaction[],
): Promise<Transaction[]> {
  const existing = await getAllTransactions()
  const keys = new Set(
    existing.map(
      (t) => `${t.date}|${t.description}|${t.amount.toFixed(2)}`,
    ),
  )
  return candidates.filter(
    (t) => !keys.has(`${t.date}|${t.description}|${t.amount.toFixed(2)}`),
  )
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
