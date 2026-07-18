import { putMerchantMemoryBatch } from "../finance/storage"
import type { CategoryId, MerchantMemory } from "../types"
import { merchantKeyFromDescription } from "./keys"

export type MerchantMemorySource = MerchantMemory["source"]

/** Keys to persist so future imports match narration + merchant variants. */
export function memoryKeysForTransaction(
  merchant: string,
  description: string,
): string[] {
  const keys = new Set<string>()
  const merchantKey = merchantKeyFromDescription(merchant)
  const descriptionKey = merchantKeyFromDescription(description)

  if (merchantKey) keys.add(merchantKey)
  if (descriptionKey) keys.add(descriptionKey)

  const words = merchantKey.split(" ").filter(Boolean)
  if (words.length >= 2) {
    keys.add(words.slice(0, 2).join(" "))
  }
  if (words[0] && words[0].length >= 4) {
    keys.add(words[0])
  }

  return [...keys]
}

export function lookupMerchantMemory(
  description: string,
  merchant: string,
  memory: Map<string, MerchantMemory>,
): MerchantMemory | undefined {
  const keys = memoryKeysForTransaction(merchant, description)
  for (const key of keys) {
    const hit = memory.get(key)
    if (hit) return hit
  }

  const descKey = merchantKeyFromDescription(description)
  for (const [key, entry] of memory) {
    if (key.length >= 4 && descKey.includes(key)) return entry
    if (
      entry.merchantName &&
      descKey.includes(merchantKeyFromDescription(entry.merchantName))
    ) {
      return entry
    }
  }

  return undefined
}

export async function rememberMerchantMapping(params: {
  merchant: string
  description: string
  categoryId: CategoryId
  isSubscription?: boolean
  source: NonNullable<MerchantMemorySource>
}): Promise<void> {
  const keys = memoryKeysForTransaction(params.merchant, params.description)
  await putMerchantMemoryBatch(
    keys.map((merchantKey) => ({
      merchantKey,
      categoryId: params.categoryId,
      merchantName: params.merchant,
      isSubscription: params.isSubscription,
      source: params.source,
    })),
  )
}
