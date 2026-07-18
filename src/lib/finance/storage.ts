import { SEED_CATEGORIES } from "../categories"
import * as cloud from "../db-cloud"
import * as local from "../db"
import type {
  AppSettings,
  Category,
  CategoryId,
  MerchantMemory,
  Statement,
  Transaction,
} from "../types"

export type FinanceStorageMode = "local" | "cloud"

let mode: FinanceStorageMode = "local"

export function setFinanceStorageMode(next: FinanceStorageMode) {
  mode = next
}

export function getFinanceStorageMode(): FinanceStorageMode {
  return mode
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return mode === "cloud"
    ? cloud.getAllTransactions()
    : local.getAllTransactions()
}

export async function getAllStatements(): Promise<Statement[]> {
  return mode === "cloud"
    ? cloud.getAllStatements()
    : local.getAllStatements()
}

export async function getCategories(): Promise<Category[]> {
  if (mode === "cloud") return SEED_CATEGORIES
  return local.getCategories()
}

export async function getSettings(): Promise<AppSettings> {
  return mode === "cloud" ? cloud.getSettings() : local.getSettings()
}

export async function getMerchantMemory(): Promise<MerchantMemory[]> {
  return mode === "cloud"
    ? cloud.getMerchantMemory()
    : local.getMerchantMemory()
}

export async function getMerchantMemoryMap(): Promise<Map<string, CategoryId>> {
  const rows = await getMerchantMemory()
  return new Map(rows.map((r) => [r.merchantKey, r.categoryId]))
}

export async function getMerchantMemoryIndex(): Promise<
  Map<string, MerchantMemory>
> {
  const rows = await getMerchantMemory()
  return new Map(rows.map((r) => [r.merchantKey, r]))
}

export async function saveImport(params: {
  statement: Statement
  transactions: Transaction[]
}): Promise<void> {
  if (mode === "cloud") return cloud.saveImport(params)
  return local.saveImport(params)
}

export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>,
): Promise<void> {
  if (mode === "cloud") return cloud.updateTransaction(id, patch)
  return local.updateTransaction(id, patch)
}

export async function updateTransactionsBatch(
  updates: Array<{ id: string; patch: Partial<Transaction> }>,
): Promise<void> {
  if (mode === "cloud") return cloud.updateTransactionsBatch(updates)
  return local.updateTransactionsBatch(updates)
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
  if (mode === "cloud") return cloud.putMerchantMemoryBatch(entries)
  return local.putMerchantMemoryBatch(entries)
}

export async function filterNewTransactions(
  candidates: Transaction[],
): Promise<Transaction[]> {
  return mode === "cloud"
    ? cloud.filterNewTransactions(candidates)
    : local.filterNewTransactions(candidates)
}

/** Always clears local IndexedDB only — cloud data is untouched. */
export async function clearAllData(): Promise<void> {
  return local.clearAllData()
}

export { merchantKeyFromDescription } from "../merchants/keys"
