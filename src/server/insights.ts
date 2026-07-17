import { createServerFn } from "@tanstack/react-start"
import { mistralChat } from "@/lib/mistral"

export type InsightTip = {
  title: string
  detail: string
  /** Rough monthly savings potential in INR, if estimable */
  potentialSaveInr?: number
}

export type TrendInsightsResult = {
  summary: string
  tips: InsightTip[]
}

const SYSTEM = `You are RupeeLens AI, a personal finance coach for an Indian user.
Given their monthly spend context, produce practical money-saving advice grounded ONLY in the provided numbers.
Be specific (merchants, categories, amounts in ₹). Do not invent transactions.
Prefer 3–5 actionable tips. Skip generic advice like "make a budget" unless tied to their data.
Respond with JSON only:
{
  "summary": "2–3 sentence overview of this month's spend pattern",
  "tips": [
    {
      "title": "short action title",
      "detail": "1–2 sentences with concrete numbers from the context",
      "potentialSaveInr": optional number estimate of monthly savings
    }
  ]
}`

export const generateTrendInsights = createServerFn({ method: "POST" })
  .validator((data: { financeContext: string; monthLabel: string }) => data)
  .handler(async ({ data }): Promise<TrendInsightsResult> => {
    const raw = await mistralChat({
      model: "mistral-small-latest",
      temperature: 0.4,
      json: true,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Month: ${data.monthLabel}\n\n${data.financeContext}\n\nReturn JSON with summary and tips to help this user save money.`,
        },
      ],
    })

    let parsed: TrendInsightsResult
    try {
      parsed = JSON.parse(raw) as TrendInsightsResult
    } catch {
      throw new Error("Could not parse AI insights response")
    }

    const tips = Array.isArray(parsed.tips)
      ? parsed.tips
          .filter((t) => t && typeof t.title === "string" && typeof t.detail === "string")
          .slice(0, 6)
          .map((t) => ({
            title: t.title.trim(),
            detail: t.detail.trim(),
            potentialSaveInr:
              typeof t.potentialSaveInr === "number" && t.potentialSaveInr > 0
                ? Math.round(t.potentialSaveInr)
                : undefined,
          }))
      : []

    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Here are a few ways to tighten spending this month.",
      tips,
    }
  })
