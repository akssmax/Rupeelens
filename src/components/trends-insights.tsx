import { useEffect, useMemo, useRef, useState } from "react"
import { Lightbulb, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendsInsightsSkeleton } from "@/components/page-skeletons"
import { buildTrendsContext } from "@/lib/finance-context"
import { formatINR, formatMonthLabel } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import {
  generateTrendInsights,
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

export function TrendsInsights({
  transactions,
  month,
}: {
  transactions: Transaction[]
  month: string
}) {
  const cacheKey = useMemo(
    () => trendsCacheKey(month, transactions),
    [month, transactions],
  )
  const [data, setData] = useState<TrendInsightsResult | null>(
    () => cache.get(cacheKey) ?? null,
  )
  const [loading, setLoading] = useState(!cache.has(cacheKey))
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
      setError(message)
      toast.error("Could not load AI insights", { description: message })
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    const cached = cache.get(cacheKey)
    setData(cached ?? null)
    setLoading(!cached)
    setError(null)
    if (!cached) void load(false)
  }, [cacheKey])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary size-4" />
            AI savings insights
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Personalized tips for {formatMonthLabel(month)} based on your spend
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void load(true)}
          disabled={loading}
          aria-label="Refresh insights"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? <TrendsInsightsSkeleton /> : null}

        {error && !data ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load(true)}>
              Try again
            </Button>
          </div>
        ) : null}

        {data ? (
          <>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            {data.tips.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No specific cutbacks stood out — keep tracking next month.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.tips.map((tip, i) => (
                  <li
                    key={`${i}-${tip.title}`}
                    className="bg-muted/40 flex gap-3 rounded-lg p-3"
                  >
                    <div className="bg-primary/15 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                      <Lightbulb className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-medium">{tip.title}</p>
                        {tip.potentialSaveInr != null ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium tabular-nums">
                            ~{formatINR(tip.potentialSaveInr, true)}/mo
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {tip.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
