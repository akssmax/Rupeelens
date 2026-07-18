import type { CategoryId, MerchantMemory, Transaction } from "../types"
import { findCatalogMerchant } from "./catalog"
import { extractMerchantName } from "./extract"
import { matchKeywordCategory } from "./keyword-rules"
import { lookupMerchantMemory } from "./memory"

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
    if (profile) {
      hits.push({
        id: t.id,
        merchant: profile.name,
        categoryId: profile.categoryId,
        isSubscription: Boolean(profile.isSubscription),
        confidence: 0.95,
        source: "rules",
      })
      continue
    }
    const keyword = matchKeywordCategory(t.description)
    if (keyword) {
      hits.push({
        id: t.id,
        merchant: keyword.merchant,
        categoryId: keyword.categoryId,
        isSubscription: false,
        confidence: keyword.confidence,
        source: "rules",
      })
    }
  }
  return hits
}

/**
 * Layer 2 — merchant memory from past LLM / user corrections.
 */
export function applyMemoryCategorization(
  transactions: Transaction[],
  memory: Map<string, MerchantMemory>,
  alreadyResolved: Set<string>,
): LocalCategorizeHit[] {
  const hits: LocalCategorizeHit[] = []
  for (const t of transactions) {
    if (alreadyResolved.has(t.id)) continue
    const merchant = extractMerchantName(t.description)
    const memoryHit = lookupMerchantMemory(t.description, merchant, memory)
    if (!memoryHit) continue
    hits.push({
      id: t.id,
      merchant: memoryHit.merchantName || merchant,
      categoryId: memoryHit.categoryId,
      isSubscription:
        memoryHit.isSubscription ?? memoryHit.categoryId === "subscriptions",
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
