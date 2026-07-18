import { getAuthRequestHeaders } from "@/lib/auth/request-headers.client"
import {
  getAllStatements,
  getAllTransactions,
  getMerchantMemory,
} from "@/lib/db"
import { migrateLocalDataToCloud } from "@/server/migrate-local-data"

export async function migrateIndexedDbToCloud(): Promise<{
  statements: number
  transactions: number
  merchantMemory: number
}> {
  const [statements, transactions, merchantMemory] = await Promise.all([
    getAllStatements(),
    getAllTransactions(),
    getMerchantMemory(),
  ])

  if (
    statements.length === 0 &&
    transactions.length === 0 &&
    merchantMemory.length === 0
  ) {
    return { statements: 0, transactions: 0, merchantMemory: 0 }
  }

  const headers = await getAuthRequestHeaders()
  await migrateLocalDataToCloud({
    headers,
    data: { statements, transactions, merchantMemory },
  })

  return {
    statements: statements.length,
    transactions: transactions.length,
    merchantMemory: merchantMemory.length,
  }
}
