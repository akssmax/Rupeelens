import { useEffect, useMemo, useRef, useState } from "react"
import { buildTrendsContext } from "@/lib/finance-context"
import { monthlySummary } from "@/lib/analytics"
import { formatINR, formatMonthLabel } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import {
  generateTrendInsights,
  type InsightHighlight,
  type TrendInsightsResult,
} from "@/server/insights"

const cache = new Map<string, TrendInsightsResult>()

function trendsCacheKey(month: string, transactions: Transaction[]): string {
  let hash = 0
  for (const t of transactions) {
    if (!t.date.startsWith(month)) continue
    hash = (hash * 31 + t.categoryId.charCodeAt(0) + t.debit + t.credit) | 0
  }
  return `${month}:${hash}`
}

function localFallbackInsights(
  transactions: Transaction[],
  month: string,
): TrendInsightsResult {
  const s = monthlySummary(transactions, month)
  const topCat = s.byCategory[0]
  const topMerchant = s.topMerchants[0]
  const subs = s.byCategory.find((c) => c.categoryId === "subscriptions")

  const highlights: InsightHighlight[] = []
  if (topCat) {
    highlights.push({
      title: "Top category",
      value: formatINR(topCat.amount, true),
      insight: `${topCat.name} leads your spending this month`,
      tone: "warning",
    })
  }
  if (topMerchant) {
    highlights.push({
      title: "Top merchant",
      value: formatINR(topMerchant.amount, true),
      insight: `${topMerchant.merchant} · ${topMerchant.count} transactions`,
      tone: "neutral",
    })
  }
  highlights.push({
    title: "Monthly net",
    value: formatINR(s.net, true),
    insight:
      s.net >= 0
        ? "You saved more than you spent — keep it up"
        : "Spending exceeded income — review discretionary buys",
    tone: s.net >= 0 ? "positive" : "warning",
  })
  if (subs && subs.amount > 0) {
    highlights.push({
      title: "Subscriptions",
      value: formatINR(subs.amount, true),
      insight: "Audit recurring charges you rarely use",
      tone: "neutral",
    })
  }

  const tips = []
  if (topMerchant && topMerchant.amount > 5000) {
    tips.push({
      title: `Review ${topMerchant.merchant} spend`,
      detail: `You spent ${formatINR(topMerchant.amount)} across ${topMerchant.count} orders. Batch orders or set a weekly cap.`,
      potentialSaveInr: Math.round(topMerchant.amount * 0.15),
    })
  }
  if (s.net < 0) {
    tips.push({
      title: "Close the gap",
      detail: `Expenses beat income by ${formatINR(Math.abs(s.net))}. Trim food delivery and impulse shopping first.`,
      potentialSaveInr: Math.round(Math.abs(s.net) * 0.2),
    })
  }
  if (subs && subs.amount > 1000) {
    tips.push({
      title: "Trim subscriptions",
      detail: `Recurring spend is ${formatINR(subs.amount)}. Cancel one service you haven't used in 30 days.`,
      potentialSaveInr: Math.round(subs.amount * 0.25),
    })
  }

  return {
    summary: `You spent ${formatINR(s.totalDebit)} and earned ${formatINR(s.totalCredit)} in ${formatMonthLabel(month)}.`,
    highlights: highlights.slice(0, 4),
    tips: tips.slice(0, 4),
    source: "local",
  }
}

export function useTrendInsights(transactions: Transaction[], month: string) {
  const cacheKey = useMemo(
    () => trendsCacheKey(month, transactions),
    [month, transactions],
  )
  const [data, setData] = useState<TrendInsightsResult | null>(
    () => cache.get(cacheKey) ?? null,
  )
  const [loading, setLoading] = useState(Boolean(month) && !cache.has(cacheKey))
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = async (force = false) => {
    if (!month) return
    if (!force && cache.has(cacheKey)) {
      setData(cache.get(cacheKey)!)
      setLoading(false)
      setError(null)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const financeContext = buildTrendsContext(transactions, month)
      const result = await generateTrendInsights({
        data: {
          financeContext,
          monthLabel: formatMonthLabel(month),
        },
      })
      if (id !== requestId.current) return
      cache.set(cacheKey, result)
      setData(result)
    } catch (e) {
      if (id !== requestId.current) return
      const message = e instanceof Error ? e.message : String(e)
      const fallback = localFallbackInsights(transactions, month)
      cache.set(cacheKey, fallback)
      setData(fallback)
      setError(message)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!month) return
    const cached = cache.get(cacheKey)
    setData(cached ?? null)
    setLoading(!cached)
    setError(null)
    if (!cached) void load(false)
  }, [cacheKey, month])

  return { data, loading, error, refresh: () => load(true) }
}
