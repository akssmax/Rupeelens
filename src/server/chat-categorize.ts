import { createServerFn } from "@tanstack/react-start"
import {
  CATEGORY_IDS,
  normalizeCategory,
  resolveCategoryName,
} from "@/lib/categories"
import type { CategorizationAction } from "@/lib/chat-categorize"
import { mistralChat } from "@/lib/mistral"
import type { CategoryId } from "@/lib/types"
import type { ChatMessage } from "./chat"

export type ParsedCategorization = {
  intent: "categorize" | "none"
  actions: CategorizationAction[]
  reply: string
}

function buildSystemPrompt(categoryIds: string[]): string {
  const ids = [
    ...new Set([
      ...CATEGORY_IDS.filter((c) => c !== "uncategorized"),
      ...categoryIds.filter((c) => c !== "uncategorized"),
    ]),
  ]

  return `You parse natural-language requests to categorize uncategorized bank transactions in RupeeLens.
Return JSON only:
{
  "intent": "categorize" | "none",
  "actions": [
    { "merchantQuery": "Bistro", "categoryId": "food", "categoryName": "Food" }
  ],
  "reply": "short conversational preview for the user"
}

Rules:
- intent "categorize" only when the user assigns merchants to categories or asks to update transaction categories
- intent "none" for questions, analysis, or when merchant/category is ambiguous — reply should ask for clarification
- merchantQuery must match a merchant from the uncategorized context (exact or close spelling)
- categoryId MUST be one of: ${ids.join(", ")}
- categoryName is the human-readable category label
- Support multiple merchants in one message (e.g. "Bistro and Gk Wines are food")
- Map natural language to categories: dining/restaurant → food, liquor/beer → alcohol, wine shop → wine
- Never invent merchants not listed in the uncategorized context
- reply should summarize what will be updated and ask the user to confirm (do not claim changes are already applied)
Return only valid JSON, no markdown.`
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const payload = fenced?.[1]?.trim() ?? trimmed
  return JSON.parse(payload)
}

export const parseChatCategorization = createServerFn({ method: "POST" })
  .validator(
    (data: {
      message: string
      recentMessages?: ChatMessage[]
      uncategorizedContext: string
      categoryIds?: string[]
      model?: string
    }) => data,
  )
  .handler(async ({ data }): Promise<ParsedCategorization> => {
    const categoryIds = data.categoryIds ?? CATEGORY_IDS
    const recent = (data.recentMessages ?? []).slice(-4)
    const userContent = [
      `User message: ${data.message}`,
      "",
      "--- UNCategorized CONTEXT ---",
      data.uncategorizedContext,
      "--- END CONTEXT ---",
    ].join("\n")

    const content = await mistralChat({
      model: data.model || "mistral-small-latest",
      temperature: 0.1,
      json: true,
      messages: [
        { role: "system", content: buildSystemPrompt(categoryIds) },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userContent },
      ],
    })

    const parsed = extractJson(content) as {
      intent?: string
      actions?: Array<{
        merchantQuery?: string
        categoryId?: string
        categoryName?: string
      }>
      reply?: string
    }

    const intent = parsed.intent === "categorize" ? "categorize" : "none"
    const actions: CategorizationAction[] = (parsed.actions ?? [])
      .map((action) => {
        const merchantQuery = (action.merchantQuery || "").trim()
        if (!merchantQuery) return null
        const categoryId = normalizeCategory(
          action.categoryId || action.categoryName || "other",
        ) as CategoryId
        return {
          merchantQuery,
          categoryId,
          categoryName:
            action.categoryName?.trim() ||
            resolveCategoryName(categoryId) ||
            categoryId,
        }
      })
      .filter((action): action is CategorizationAction => action !== null)

    return {
      intent,
      actions,
      reply:
        parsed.reply?.trim() ||
        (intent === "categorize"
          ? "Review the proposed category changes below."
          : "I couldn't map that to a merchant and category yet."),
    }
  })
