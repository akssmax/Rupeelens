import { createServerFn } from "@tanstack/react-start"
import { mistralChat } from "@/lib/mistral"

export type InsightHighlight = {
  title: string
  value: string
  insight: string
  tone?: "neutral" | "warning" | "positive"
}

export type InsightTip = {
  title: string
  detail: string
  /** Rough monthly savings potential in INR, if estimable */
  potentialSaveInr?: number
}

export type TrendInsightsResult = {
  summary: string
  highlights: InsightHighlight[]
  tips: InsightTip[]
  source?: "ai" | "local"
}

const SYSTEM = `You are RupeeLens AI, a personal finance coach for an Indian user.
Given their monthly spend context, produce practical money-saving advice grounded ONLY in the provided numbers.
Be specific (merchants, categories, amounts in ₹). Do not invent transactions.
Prefer 3–5 actionable tips. Skip generic advice like "make a budget" unless tied to their data.
Also include 3 highlight cards summarizing the month at a glance.
Respond with JSON only:
{
  "summary": "2–3 sentence overview of this month's spend pattern",
  "highlights": [
    {
      "title": "short label e.g. Top category",
      "value": "₹ amount or compact metric",
      "insight": "one sentence takeaway",
      "tone": "neutral" | "warning" | "positive"
    }
  ],
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

    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights
          .filter(
            (h) =>
              h &&
              typeof h.title === "string" &&
              typeof h.value === "string" &&
              typeof h.insight === "string",
          )
          .slice(0, 4)
          .map((h) => ({
            title: h.title.trim(),
            value: h.value.trim(),
            insight: h.insight.trim(),
            tone:
              h.tone === "warning" || h.tone === "positive"
                ? h.tone
                : ("neutral" as const),
          }))
      : []

    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Here are a few ways to tighten spending this month.",
      highlights,
      tips,
      source: "ai" as const,
    }
  })
