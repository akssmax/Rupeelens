import { createClientOnlyFn } from "@tanstack/react-start"
import {
  getAllStatements,
  getAllTransactions,
  getMerchantMemory,
} from "@/lib/db"
import { migrateLocalDataToCloud } from "@/server/migrate-local-data"

export const migrateIndexedDbToCloud = createClientOnlyFn(async () => {
  const { getAuthRequestHeaders } = await import(
    "@/lib/auth/request-headers.client"
  )

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
})
