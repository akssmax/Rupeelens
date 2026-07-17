import type { CategoryId, Transaction } from "../types"
import { merchantKeyFromDescription } from "./keys"
import { findCatalogMerchant } from "./catalog"
import { extractMerchantName } from "./extract"

export type CategorizeSource = "rules" | "memory" | "llm"

export interface LocalCategorizeHit {
  id: string
  merchant: string
  categoryId: CategoryId
  isSubscription: boolean
  confidence: number
  source: CategorizeSource
}

/**
 * Layer 1 — deterministic rules from curated merchant catalog.
 * Fast, offline, logo-ready.
 */
export function applyRuleCategorization(
  transactions: Transaction[],
): LocalCategorizeHit[] {
  const hits: LocalCategorizeHit[] = []
  for (const t of transactions) {
    const profile = findCatalogMerchant(t.description)
    if (!profile) continue
    hits.push({
      id: t.id,
      merchant: profile.name,
      categoryId: profile.categoryId,
      isSubscription: Boolean(profile.isSubscription),
      confidence: 0.95,
      source: "rules",
    })
  }
  return hits
}

/**
 * Layer 2 — merchant memory from past LLM / user corrections.
 */
export function applyMemoryCategorization(
  transactions: Transaction[],
  memory: Map<string, CategoryId>,
  alreadyResolved: Set<string>,
): LocalCategorizeHit[] {
  const hits: LocalCategorizeHit[] = []
  for (const t of transactions) {
    if (alreadyResolved.has(t.id)) continue
    const merchant = extractMerchantName(t.description)
    const categoryId =
      memory.get(merchantKeyFromDescription(merchant)) ||
      memory.get(merchant.toLowerCase()) ||
      memory.get(merchantKeyFromDescription(t.description))
    if (!categoryId) continue
    hits.push({
      id: t.id,
      merchant,
      categoryId,
      isSubscription: categoryId === "subscriptions",
      confidence: 0.9,
      source: "memory",
    })
  }
  return hits
}

export function needsLlm(transactions: Transaction[], resolvedIds: Set<string>) {
  return transactions.filter(
    (t) =>
      !resolvedIds.has(t.id) &&
      (t.categoryId === "uncategorized" || !t.merchant),
  )
}

export { extractMerchantName }
