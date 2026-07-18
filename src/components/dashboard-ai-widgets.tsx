import {
  Lightbulb,
  Loader2,
  PiggyBank,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrendInsights } from "@/hooks/use-trend-insights"
import { formatINR, formatMonthLabel } from "@/lib/format"
import type { Transaction } from "@/lib/types"
import type { InsightHighlight, TrendInsightsResult } from "@/server/insights"
import { cn } from "@/lib/utils"

function highlightToneClass(tone?: InsightHighlight["tone"]) {
  if (tone === "positive") {
    return "border-emerald-500/20 bg-emerald-500/5"
  }
  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/5"
  }
  return "border-border/60 bg-muted/30"
}

function InsightsRefreshButton({
  loading,
  onRefresh,
}: {
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onRefresh}
      disabled={loading}
      aria-label="Refresh AI insights"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
    </Button>
  )
}

function AiSummaryCards({
  data,
  loading,
  month,
  onRefresh,
}: {
  data: TrendInsightsResult | null
  loading: boolean
  month: string
  onRefresh: () => void
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary size-4" />
            AI summary
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            {formatMonthLabel(month)} at a glance
            {data?.source === "local" ? " · offline estimates" : null}
          </p>
        </div>
        <InsightsRefreshButton loading={loading} onRefresh={onRefresh} />
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl sm:col-span-2" />
          </div>
        ) : null}

        {data ? (
          <>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.highlights.map((h, i) => (
                <div
                  key={`${h.title}-${i}`}
                  className={cn(
                    "rounded-xl border p-3",
                    highlightToneClass(h.tone),
                  )}
                >
                  <p className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase">
                    {h.title}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {h.value}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {h.insight}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SavingsTips({
  data,
  loading,
  month,
  onRefresh,
}: {
  data: TrendInsightsResult | null
  loading: boolean
  month: string
  onRefresh: () => void
}) {
  const icons = [PiggyBank, TrendingDown, Wallet, Lightbulb]

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="text-primary size-4" />
            Tips to save
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Actionable cutbacks for {formatMonthLabel(month)}
          </p>
        </div>
        <InsightsRefreshButton loading={loading} onRefresh={onRefresh} />
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : null}

        {data && data.tips.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No specific cutbacks stood out — keep tracking through the month.
          </p>
        ) : null}

        {data && data.tips.length > 0 ? (
          <ul className="space-y-3">
            {data.tips.slice(0, 5).map((tip, i) => {
              const Icon = icons[i % icons.length]!
              return (
                <li
                  key={`${i}-${tip.title}`}
                  className="bg-muted/40 flex gap-3 rounded-lg p-3"
                >
                  <div className="bg-primary/15 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" />
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
              )
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DashboardAiWidgets({
  transactions,
  month,
}: {
  transactions: Transaction[]
  month: string
}) {
  const { data, loading, refresh } = useTrendInsights(transactions, month)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AiSummaryCards
        data={data}
        loading={loading}
        month={month}
        onRefresh={() => void refresh()}
      />
      <SavingsTips
        data={data}
        loading={loading}
        month={month}
        onRefresh={() => void refresh()}
      />
    </div>
  )
}
