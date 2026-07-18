import { parseBankCsv } from "./banks"
import { extractUpiReference } from "./finance/transaction-dedupe"
import {
  filterNewTransactions,
  getMerchantMemoryIndex,
  saveImport,
} from "./finance/storage"
import { findCatalogMerchant } from "./merchants/catalog"
import { extractMerchantName } from "./merchants/extract"
import { lookupMerchantMemory } from "./merchants/memory"
import type {
  BankId,
  ColumnMapping,
  MerchantMemory,
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
  memory: Map<string, MerchantMemory>,
): Transaction[] {
  return rows.map((row) => {
    const catalog = findCatalogMerchant(row.description)
    const merchant = catalog?.name || extractMerchantName(row.description)
    const memoryHit = catalog
      ? undefined
      : lookupMerchantMemory(row.description, merchant, memory)

    const description = row.description.trim().replace(/\s+/g, " ")
    const bankRef = row.bankRef || extractUpiReference(description)

    return {
      id: uid("tx"),
      statementId,
      date: row.date,
      valueDate: row.valueDate,
      description,
      debit: row.debit,
      credit: row.credit,
      amount: row.credit - row.debit,
      balance: row.balance,
      bankRef,
      categoryId: catalog?.categoryId ?? memoryHit?.categoryId ?? "uncategorized",
      merchant,
      isSubscription:
        catalog?.isSubscription ??
        memoryHit?.isSubscription ??
        memoryHit?.categoryId === "subscriptions",
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

  const memory = await getMerchantMemoryIndex()
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
