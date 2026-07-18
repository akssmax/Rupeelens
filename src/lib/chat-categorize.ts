import { resolveCategoryName } from "./categories"
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
  toUpdate: Transaction[]
  alreadyCorrect: Transaction[]
  currentCategoryName?: string
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

export function matchMerchantTransactions(
  transactions: Transaction[],
  merchantQuery: string,
): Transaction[] {
  return transactions.filter((tx) => merchantMatchesQuery(tx, merchantQuery))
}

/** @deprecated Use matchMerchantTransactions — kept for tests referencing uncategorized-only flows */
export function matchUncategorizedTransactions(
  transactions: Transaction[],
  merchantQuery: string,
): Transaction[] {
  return matchMerchantTransactions(transactions, merchantQuery).filter(
    (tx) => tx.categoryId === "uncategorized" || !tx.merchant,
  )
}

function dominantCurrentCategory(transactions: Transaction[]): string | undefined {
  if (transactions.length === 0) return undefined

  const counts = new Map<string, number>()
  for (const tx of transactions) {
    const name = resolveCategoryName(tx.categoryId) || tx.categoryId
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 1) return sorted[0]?.[0]
  return "Mixed"
}

export function previewCategorizationActions(
  transactions: Transaction[],
  actions: CategorizationAction[],
): CategorizationPreview[] {
  return actions.map((action) => {
    const matched = matchMerchantTransactions(transactions, action.merchantQuery)
    const toUpdate = matched.filter((tx) => tx.categoryId !== action.categoryId)
    const alreadyCorrect = matched.filter(
      (tx) => tx.categoryId === action.categoryId,
    )

    let skippedReason: string | undefined
    if (matched.length === 0) {
      skippedReason = `No transactions match "${action.merchantQuery}"`
    } else if (toUpdate.length === 0) {
      skippedReason = `All ${matched.length} ${action.merchantQuery} transaction${matched.length === 1 ? "" : "s"} already in ${action.categoryName}`
    }

    return {
      ...action,
      matched,
      toUpdate,
      alreadyCorrect,
      currentCategoryName: dominantCurrentCategory(toUpdate),
      skippedReason,
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
    .filter((p) => p.toUpdate.length > 0)
    .map((p) => {
      const sample = p.toUpdate
        .slice(0, 3)
        .map((tx) => {
          const amt =
            tx.debit > 0 ? formatINR(tx.debit) : formatINR(tx.credit)
          return `${tx.date} ${amt}`
        })
        .join(", ")
      const from =
        p.currentCategoryName && p.currentCategoryName !== p.categoryName
          ? ` (from ${p.currentCategoryName})`
          : ""
      const skipped =
        p.alreadyCorrect.length > 0
          ? `, ${p.alreadyCorrect.length} already in ${p.categoryName}`
          : ""
      return `- **${p.merchantQuery}** → ${p.categoryName}${from}: ${p.toUpdate.length} to update${skipped}${sample ? ` — ${sample}` : ""}`
    })

  const skipped = previews.filter(
    (p) => p.matched.length === 0 || p.toUpdate.length === 0,
  )
  if (skipped.length) {
    lines.push(
      ...skipped
        .filter((p) => p.skippedReason)
        .map((p) => `- **${p.merchantQuery}**: ${p.skippedReason}`),
    )
  }

  return lines.join("\n")
}

export function looksLikeCategorizationRequest(message: string): boolean {
  const lower = message.toLowerCase()
  const patterns = [
    /\bbelongs?\s+to\b/,
    /\bbelongs?\s+in\b/,
    /\bcategor(?:ize|y|ise)\b/,
    /\bset\s+.+\s+as\b/,
    /\bupdate\s+(the\s+)?transactions?\b/,
    /\bmark\s+.+\s+as\b/,
    /\bassign\s+.+\s+to\b/,
    /\bput\s+.+\s+(?:in|under)\b/,
    /\bmove\s+.+\s+to\b/,
    /\bchange\s+.+\s+to\b/,
  ]
  return patterns.some((pattern) => pattern.test(lower))
}
