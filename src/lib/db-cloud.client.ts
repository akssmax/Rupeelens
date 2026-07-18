import "@tanstack/react-start/client-only"

import { getAuthRequestHeaders } from "@/lib/auth/request-headers.client"
import {
  createCloudCategory,
  fetchCloudCategories,
  fetchCloudFinanceData,
  filterCloudNewTransactions,
  saveCloudImport,
  updateCloudTransaction,
  updateCloudTransactionsBatch,
  upsertCloudMerchantMemoryBatch,
} from "@/server/finance-data"
import type {
  AppSettings,
  Category,
  CategoryId,
  MerchantMemory,
  Statement,
  Transaction,
} from "./types"

async function authOpts() {
  return { headers: await getAuthRequestHeaders() }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const { transactions } = await fetchCloudFinanceData(await authOpts())
  return transactions
}

export async function getAllStatements(): Promise<Statement[]> {
  const { statements } = await fetchCloudFinanceData(await authOpts())
  return statements
}

export async function getMerchantMemory(): Promise<MerchantMemory[]> {
  const { merchantMemory } = await fetchCloudFinanceData(await authOpts())
  return merchantMemory
}

export async function getSettings(): Promise<AppSettings> {
  const { settings } = await fetchCloudFinanceData(await authOpts())
  return settings
}

export async function getCategories(): Promise<Category[]> {
  const { categories } = await fetchCloudCategories(await authOpts())
  return categories
}

export async function createCategory(
  name: string,
  color?: string,
): Promise<Category> {
  const { category } = await createCloudCategory({
    ...(await authOpts()),
    data: { name, color },
  })
  return category
}

export async function saveImport(params: {
  statement: Statement
  transactions: Transaction[]
}): Promise<void> {
  await saveCloudImport({ ...(await authOpts()), data: params })
}

export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>,
): Promise<void> {
  await updateCloudTransaction({
    ...(await authOpts()),
    data: { id, patch },
  })
}

export async function updateTransactionsBatch(
  updates: Array<{ id: string; patch: Partial<Transaction> }>,
): Promise<void> {
  await updateCloudTransactionsBatch({
    ...(await authOpts()),
    data: { updates },
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
  await upsertCloudMerchantMemoryBatch({
    ...(await authOpts()),
    data: { entries },
  })
}

export async function filterNewTransactions(
  candidates: Transaction[],
): Promise<Transaction[]> {
  const { transactions } = await filterCloudNewTransactions({
    ...(await authOpts()),
    data: { candidates },
  })
  return transactions
}
