import { isNeedsReviewTransaction } from "./finance-context"
import { formatINR } from "./format"
import { extractMerchantName } from "./merchants/extract"
import { merchantKeyFromDescription } from "./merchants/keys"
import type { CategoryId, Transaction } from "./types"

export type CategorizationAction = {
  merchantQuery: string
  categoryId: CategoryId
  categoryName: string
}

export type CategorizationPreview = CategorizationAction & {
  matched: Transaction[]
  skippedReason?: string
}

export type ApplyMerchantCategorizationInput = CategorizationPreview

export type ApplyMerchantCategorizationResult = {
  updated: number
  merchants: Array<{
    merchantQuery: string
    categoryName: string
    count: number
  }>
}

function transactionMerchant(tx: Transaction): string {
  return tx.merchant || extractMerchantName(tx.description) || "Unknown"
}

function normalizeQuery(query: string): string {
  return merchantKeyFromDescription(query.trim())
}

export function merchantMatchesQuery(
  tx: Transaction,
  merchantQuery: string,
): boolean {
  if (!isNeedsReviewTransaction(tx)) return false

  const query = normalizeQuery(merchantQuery)
  if (!query || query.length < 2) return false

  const merchant = transactionMerchant(tx)
  const merchantKey = merchantKeyFromDescription(merchant)
  const descKey = merchantKeyFromDescription(tx.description)
  const rawQuery = merchantQuery.trim().toLowerCase()

  if (merchantKey === query) return true
  if (merchantKey.includes(query) || query.includes(merchantKey)) return true
  if (descKey.includes(query)) return true
  if (merchant.toLowerCase().includes(rawQuery)) return true

  return false
}

export function matchUncategorizedTransactions(
  transactions: Transaction[],
  merchantQuery: string,
): Transaction[] {
  return transactions.filter((tx) => merchantMatchesQuery(tx, merchantQuery))
}

export function previewCategorizationActions(
  transactions: Transaction[],
  actions: CategorizationAction[],
): CategorizationPreview[] {
  return actions.map((action) => {
    const matched = matchUncategorizedTransactions(
      transactions,
      action.merchantQuery,
    )
    return {
      ...action,
      matched,
      skippedReason:
        matched.length === 0
          ? `No uncategorized transactions match "${action.merchantQuery}"`
          : undefined,
    }
  })
}

export function buildCategorizationUpdates(
  matched: Transaction[],
  categoryId: CategoryId,
) {
  const updates = matched.map((tx) => ({
    id: tx.id,
    patch: {
      categoryId,
      categorySource: "user" as const,
    },
  }))

  const memoryItems = matched.map((tx) => ({
    merchant: transactionMerchant(tx),
    description: tx.description,
    categoryId,
    isSubscription: categoryId === "subscriptions",
    source: "user" as const,
  }))

  return { updates, memoryItems }
}

export function formatPreviewSummary(previews: CategorizationPreview[]): string {
  const lines = previews
    .filter((p) => p.matched.length > 0)
    .map((p) => {
      const sample = p.matched
        .slice(0, 3)
        .map((tx) => {
          const amt =
            tx.debit > 0 ? formatINR(tx.debit) : formatINR(tx.credit)
          return `${tx.date} ${amt}`
        })
        .join(", ")
      return `- **${p.merchantQuery}** → ${p.categoryName} (${p.matched.length} txn${p.matched.length === 1 ? "" : "s"}${sample ? `: ${sample}` : ""})`
    })

  const skipped = previews.filter((p) => p.matched.length === 0)
  if (skipped.length) {
    lines.push(
      ...skipped.map(
        (p) =>
          `- **${p.merchantQuery}**: no uncategorized matches found`,
      ),
    )
  }

  return lines.join("\n")
}

export function looksLikeCategorizationRequest(message: string): boolean {
  const lower = message.toLowerCase()
  const patterns = [
    /\bbelongs?\s+to\b/,
    /\bcategor(?:ize|y|ise)\b/,
    /\bset\s+.+\s+as\b/,
    /\bupdate\s+(the\s+)?transactions?\b/,
    /\bmark\s+.+\s+as\b/,
    /\bassign\s+.+\s+to\b/,
    /\bput\s+.+\s+(?:in|under)\b/,
  ]
  return patterns.some((pattern) => pattern.test(lower))
}
