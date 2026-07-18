import type { Transaction } from "@/lib/types"

/** Normalize narrations so overlapping uploads match despite whitespace drift. */
export function normalizeTransactionDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ")
}

/** UPI narrations embed a stable reference id regardless of bank suffix padding. */
export function extractUpiReference(description: string): string | undefined {
  const match = description.match(/UPI\/P2[AM]\/(\d+)\//i)
  return match?.[1]
}

/** Prefer bank ref / UPI id so overlapping statement formats dedupe correctly. */
export function transactionDedupeKey(
  tx: Pick<Transaction, "date" | "description" | "amount" | "bankRef">,
): string {
  const upiRef = tx.bankRef || extractUpiReference(tx.description)
  if (upiRef) {
    return `${tx.date}|upi:${upiRef}|${tx.amount.toFixed(2)}`
  }

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
