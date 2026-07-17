import { createServerFn } from "@tanstack/react-start"
import { CATEGORY_IDS, normalizeCategory } from "@/lib/categories"
import { mistralChat } from "@/lib/mistral"
import type { CategorizeInput, CategorizeResult } from "@/lib/types"

const SYSTEM_PROMPT = `You are a personal finance categorizer for Indian bank statements (UPI, IMPS, NEFT, RTGS, NACH, cards).
Given transactions, return JSON only: { "results": [ { "id", "merchant", "category", "isSubscription", "confidence" } ] }
Rules:
- category MUST be one of: ${CATEGORY_IDS.filter((c) => c !== "uncategorized").join(", ")}
- merchant: short clean merchant/payee name (e.g. "Swiggy", "Netflix", "Amazon", "Safe Gold", person name for P2P)
- Extract merchant from UPI narrations like UPI/P2M/<id>/<MERCHANT>/...
- isSubscription: true for recurring services (Netflix, Spotify, Jio, Airtel, Amazon Prime, Disney+, cloud storage, gym, etc.)
- confidence: 0 to 1
- Salary credits → salary; mutual fund/SIP/broker/Safe Gold → investments; rent → rent; electricity/gas/broadband → utilities
- UPI to individuals → transfers (unless clearly a merchant)
- Food delivery (Swiggy/Zomato) → food; Blinkit/Zepto/BigBasket → groceries
- ATM/cash → cash; bank charges → fees
Return only valid JSON, no markdown.`

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const payload = fenced?.[1]?.trim() ?? trimmed
  return JSON.parse(payload)
}

export const categorizeTransactions = createServerFn({ method: "POST" })
  .validator(
    (data: { transactions: CategorizeInput[]; model?: string }) => data,
  )
  .handler(async ({ data }) => {
    const model = data.model || "mistral-small-latest"
    const batch = data.transactions
    if (!batch.length) return { results: [] as CategorizeResult[] }

    const content = await mistralChat({
      model,
      temperature: 0.1,
      json: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ transactions: batch }) },
      ],
    })

    const parsed = extractJson(content) as {
      results?: Array<{
        id: string
        merchant?: string
        category?: string
        isSubscription?: boolean
        confidence?: number
      }>
    }

    const results: CategorizeResult[] = (parsed.results ?? []).map((r) => ({
      id: r.id,
      merchant: (r.merchant || "Unknown").trim(),
      category: normalizeCategory(r.category || "other"),
      isSubscription: Boolean(r.isSubscription),
      confidence:
        typeof r.confidence === "number"
          ? Math.min(1, Math.max(0, r.confidence))
          : 0.7,
    }))

    return { results }
  })
