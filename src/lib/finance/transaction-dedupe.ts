import type { Transaction } from "@/lib/types"

/** Normalize narrations so overlapping uploads match despite whitespace drift. */
export function normalizeTransactionDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ")
}

/** Stable fingerprint for duplicate detection (per user). */
export function transactionDedupeKey(
  tx: Pick<Transaction, "date" | "description" | "amount">,
): string {
  const description = normalizeTransactionDescription(tx.description)
  return `${tx.date}|${description}|${tx.amount.toFixed(2)}`
}

export function partitionNewTransactions(
  candidates: Transaction[],
  existing: Transaction[],
): { unique: Transaction[]; skippedDuplicates: number } {
  const keys = new Set(existing.map(transactionDedupeKey))
  const unique: Transaction[] = []
  let skippedDuplicates = 0

  for (const tx of candidates) {
    const key = transactionDedupeKey(tx)
    if (keys.has(key)) {
      skippedDuplicates++
      continue
    }
    keys.add(key)
    unique.push(tx)
  }

  return { unique, skippedDuplicates }
}
