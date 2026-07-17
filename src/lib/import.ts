import { parseBankCsv } from "./banks"
import {
  filterNewTransactions,
  merchantKeyFromDescription,
  getMerchantMemoryMap,
  saveImport,
} from "./db"
import { findCatalogMerchant } from "./merchants/catalog"
import { extractMerchantName } from "./merchants/extract"
import type {
  BankId,
  CategoryId,
  ColumnMapping,
  ParsedRow,
  Statement,
  Transaction,
} from "./types"

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function rowsToTransactions(
  rows: ParsedRow[],
  statementId: string,
  memory: Map<string, CategoryId>,
): Transaction[] {
  return rows.map((row) => {
    const catalog = findCatalogMerchant(row.description)
    const merchant = catalog?.name || extractMerchantName(row.description)
    const memoryHit =
      memory.get(merchantKeyFromDescription(merchant)) ||
      memory.get(merchantKeyFromDescription(row.description))

    return {
      id: uid("tx"),
      statementId,
      date: row.date,
      valueDate: row.valueDate,
      description: row.description,
      debit: row.debit,
      credit: row.credit,
      amount: row.credit - row.debit,
      balance: row.balance,
      bankRef: row.bankRef,
      categoryId: catalog?.categoryId ?? memoryHit ?? "uncategorized",
      merchant,
      isSubscription: catalog?.isSubscription ?? false,
      confidence: catalog ? 0.95 : memoryHit ? 0.9 : undefined,
      raw: row.raw,
    }
  })
}

export async function importCsvFile(params: {
  text: string
  filename: string
  bankOverride?: BankId
  mapping?: ColumnMapping
}): Promise<{
  statement: Statement
  transactions: Transaction[]
  skippedDuplicates: number
  warnings: string[]
  bank: BankId
}> {
  const parsed = parseBankCsv(params)
  if (parsed.rows.length === 0) {
    throw new Error(
      parsed.warnings[0] ||
        "No transactions found in CSV. Check the format or use column mapping.",
    )
  }

  const dates = parsed.rows.map((r) => r.date).sort()
  const statementId = uid("stmt")
  const statement: Statement = {
    id: statementId,
    bank: parsed.bank,
    periodStart: dates[0]!,
    periodEnd: dates[dates.length - 1]!,
    uploadedAt: new Date().toISOString(),
    filename: params.filename,
    rowCount: parsed.rows.length,
  }

  const memory = await getMerchantMemoryMap()
  const candidates = rowsToTransactions(parsed.rows, statementId, memory)
  const unique = await filterNewTransactions(candidates)
  const skippedDuplicates = candidates.length - unique.length

  statement.rowCount = unique.length
  await saveImport({ statement, transactions: unique })

  return {
    statement,
    transactions: unique,
    skippedDuplicates,
    warnings: parsed.warnings,
    bank: parsed.bank,
  }
}
