import {
  getMerchantMemoryMap,
  merchantKeyFromDescription,
  putMerchantMemory,
  updateTransactionsBatch,
} from "./db"
import {
  applyMemoryCategorization,
  applyRuleCategorization,
  extractMerchantName,
  needsLlm,
} from "./merchants/pipeline"
import type { CategorizeInput, CategorizeResult, Transaction } from "./types"
import { categorizeTransactions } from "@/server/categorize"

const BATCH_SIZE = 40

export type CategorizeProgress = {
  phase: "rules" | "memory" | "llm" | "done"
  done: number
  total: number
  label: string
}

/**
 * Architecture:
 * 1. Rules  — curated Indian merchant catalog (Blinkit, Swiggy, …)
 * 2. Memory — prior LLM / user corrections keyed by merchant
 * 3. LLM    — Mistral for remaining unknowns (batched)
 */
export async function runCategorization(
  transactions: Transaction[],
  onProgress?: (p: CategorizeProgress) => void,
  options?: { force?: boolean },
): Promise<{
  updated: number
  rules: number
  memory: number
  llm: number
  errors: string[]
}> {
  const scope = options?.force
    ? transactions
    : transactions.filter(
        (t) => t.categoryId === "uncategorized" || !t.merchant,
      )

  const total = scope.length
  if (total === 0) {
    onProgress?.({
      phase: "done",
      done: 0,
      total: 0,
      label: "Nothing to categorize",
    })
    return { updated: 0, rules: 0, memory: 0, llm: 0, errors: [] }
  }

  let updated = 0
  let rules = 0
  let memory = 0
  let llm = 0
  const errors: string[] = []
  const resolved = new Set<string>()

  // --- Layer 1: rules ---
  onProgress?.({
    phase: "rules",
    done: 0,
    total,
    label: "Matching known merchants…",
  })
  const ruleHits = applyRuleCategorization(scope)
  if (ruleHits.length) {
    await updateTransactionsBatch(
      ruleHits.map((h) => ({
        id: h.id,
        patch: {
          categoryId: h.categoryId,
          merchant: h.merchant,
          isSubscription: h.isSubscription,
          confidence: h.confidence,
        },
      })),
    )
    for (const h of ruleHits) {
      resolved.add(h.id)
      await putMerchantMemory(
        merchantKeyFromDescription(h.merchant),
        h.categoryId,
      )
    }
    rules = ruleHits.length
    updated += rules
  }
  onProgress?.({
    phase: "rules",
    done: resolved.size,
    total,
    label: `Rules matched ${rules}`,
  })

  // --- Layer 2: memory ---
  onProgress?.({
    phase: "memory",
    done: resolved.size,
    total,
    label: "Applying learned merchants…",
  })
  const memoryMap = await getMerchantMemoryMap()
  // Also index by extracted merchant name keys already in memory
  const memoryHits = applyMemoryCategorization(scope, memoryMap, resolved)
  if (memoryHits.length) {
    await updateTransactionsBatch(
      memoryHits.map((h) => ({
        id: h.id,
        patch: {
          categoryId: h.categoryId,
          merchant: h.merchant,
          isSubscription: h.isSubscription,
          confidence: h.confidence,
        },
      })),
    )
    for (const h of memoryHits) resolved.add(h.id)
    memory = memoryHits.length
    updated += memory
  }

  // --- Layer 3: LLM ---
  const pending = needsLlm(scope, resolved)
  onProgress?.({
    phase: "llm",
    done: resolved.size,
    total,
    label:
      pending.length > 0
        ? `Asking Mistral about ${pending.length} transactions…`
        : "Skipping LLM — all matched locally",
  })

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const slice = pending.slice(i, i + BATCH_SIZE)
    const input: CategorizeInput[] = slice.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
    }))

    try {
      const { results } = await categorizeTransactions({
        data: { transactions: input },
      })
      const byId = new Map(results.map((r: CategorizeResult) => [r.id, r]))
      const updates: Array<{ id: string; patch: Partial<Transaction> }> = []

      for (const t of slice) {
        const r = byId.get(t.id)
        if (!r) continue
        const merchant = r.merchant || extractMerchantName(t.description)
        updates.push({
          id: t.id,
          patch: {
            categoryId: r.category,
            merchant,
            isSubscription: r.isSubscription ?? false,
            confidence: r.confidence ?? 0.5,
          },
        })
        if (r.confidence >= 0.7 && merchant) {
          await putMerchantMemory(
            merchantKeyFromDescription(merchant),
            r.category,
          )
        }
        resolved.add(t.id)
      }

      await updateTransactionsBatch(updates)
      llm += updates.length
      updated += updates.length
    } catch (e) {
      // Still extract merchant names locally so UI shows logos/names
      const fallback = slice
        .filter((t) => !resolved.has(t.id))
        .map((t) => ({
          id: t.id,
          patch: {
            merchant: extractMerchantName(t.description),
          } as Partial<Transaction>,
        }))
      if (fallback.length) {
        await updateTransactionsBatch(fallback)
      }
      errors.push(e instanceof Error ? e.message : String(e))
    }

    onProgress?.({
      phase: "llm",
      done: Math.min(total, resolved.size),
      total,
      label: `Mistral categorized ${llm}`,
    })
  }

  onProgress?.({
    phase: "done",
    done: total,
    total,
    label: `Done — ${updated} updated`,
  })

  return { updated, rules, memory, llm, errors }
}
