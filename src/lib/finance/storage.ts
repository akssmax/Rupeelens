import { createClientOnlyFn } from "@tanstack/react-start"
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

const loadCloud = createClientOnlyFn(async () => import("../db-cloud.client"))

export function setFinanceStorageMode(next: FinanceStorageMode) {
  mode = next
}

export function getFinanceStorageMode(): FinanceStorageMode {
  return mode
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return mode === "cloud"
    ? (await loadCloud()).getAllTransactions()
    : local.getAllTransactions()
}

export async function getAllStatements(): Promise<Statement[]> {
  return mode === "cloud"
    ? (await loadCloud()).getAllStatements()
    : local.getAllStatements()
}

export async function getCategories(): Promise<Category[]> {
  if (mode === "cloud") {
    return (await loadCloud()).getCategories()
  }
  return local.getCategories()
}

export async function createCategory(
  name: string,
  color?: string,
): Promise<Category> {
  if (mode === "cloud") {
    return (await loadCloud()).createCategory(name, color)
  }
  return local.createCustomCategory(name, color)
}

export async function getSettings(): Promise<AppSettings> {
  return mode === "cloud" ? (await loadCloud()).getSettings() : local.getSettings()
}

export async function getMerchantMemory(): Promise<MerchantMemory[]> {
  return mode === "cloud"
    ? (await loadCloud()).getMerchantMemory()
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
  if (mode === "cloud") return (await loadCloud()).saveImport(params)
  return local.saveImport(params)
}

export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>,
): Promise<void> {
  if (mode === "cloud") return (await loadCloud()).updateTransaction(id, patch)
  return local.updateTransaction(id, patch)
}

export async function updateTransactionsBatch(
  updates: Array<{ id: string; patch: Partial<Transaction> }>,
): Promise<void> {
  if (mode === "cloud") return (await loadCloud()).updateTransactionsBatch(updates)
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
  if (mode === "cloud") return (await loadCloud()).putMerchantMemoryBatch(entries)
  return local.putMerchantMemoryBatch(entries)
}

export async function filterNewTransactions(
  candidates: Transaction[],
): Promise<Transaction[]> {
  return mode === "cloud"
    ? (await loadCloud()).filterNewTransactions(candidates)
    : local.filterNewTransactions(candidates)
}

export async function hasLocalTransactions(): Promise<boolean> {
  return local.hasLocalTransactions()
}

/** Always clears local IndexedDB only — cloud data is untouched. */
export async function clearAllData(): Promise<void> {
  return local.clearAllData()
}

export { buildCategoryMap, mergeCategories } from "../categories"
export { merchantKeyFromDescription } from "../merchants/keys"
