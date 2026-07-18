import { useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react"
import { useAiPanel } from "@/components/ai/ai-context"
import { useUploadPanel } from "@/components/upload/upload-context"
import { CashflowChart } from "@/components/charts/cashflow-chart"
import { CategoryBars } from "@/components/charts/category-bars"
import { CategoryPie } from "@/components/charts/category-pie"
import { SpendBars } from "@/components/charts/spend-bars"
import { DashboardAiWidgets } from "@/components/dashboard-ai-widgets"
import { Onboarding } from "@/components/onboarding"
import { DashboardSkeleton } from "@/components/page-skeletons"
import { TrendsInsights } from "@/components/trends-insights"
import { MerchantAvatar } from "@/components/merchant-avatar"
import { MonthSelect } from "@/components/month-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFinanceData } from "@/hooks/use-finance-data"
import { weeklyCashflow } from "@/lib/analytics"
import { formatINR, formatMonthLabel } from "@/lib/format"

export const Route = createFileRoute("/")({ component: DashboardPage })

function DashboardPage() {
  const { openAi } = useAiPanel()
  const { openUpload } = useUploadPanel()
  const {
    loading,
    transactions,
    month,
    setMonth,
    months,
    summary,
    weekly,
    daily,
  } = useFinanceData()
  const [view, setView] = useState<"overview" | "trends">("overview")
  const [spendGrain, setSpendGrain] = useState<"daily" | "weekly">("daily")

  const cashflow = useMemo(
    () => (month ? weeklyCashflow(transactions, month) : []),
    [transactions, month],
  )

  const uncategorizedShare = useMemo(() => {
    if (!summary || summary.totalDebit === 0) return 0
    const unc =
      summary.byCategory.find((c) => c.categoryId === "uncategorized")
        ?.amount ?? 0
    return Math.round((unc / summary.totalDebit) * 100)
  }, [summary])

  const categoryChartData = useMemo(
    () =>
      summary?.byCategory.map((c) => ({
        name: c.name,
        amount: c.amount,
        color: c.color,
        categoryId: c.categoryId,
      })) ?? [],
    [summary],
  )

  if (loading) {
    return <DashboardSkeleton />
  }

  if (transactions.length === 0) {
    return <Onboarding />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            {month ? formatMonthLabel(month) : "Overview"} · income, spend, and
            categories
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelect months={months} value={month} onChange={setMonth} />
          <Button variant="outline" onClick={openUpload}>
            <Upload className="size-4" />
            Upload
          </Button>
          <Button onClick={openAi}>
            <Sparkles className="size-4" />
            Ask AI
          </Button>
        </div>
      </div>

      <Tabs
        value={view}
        onValueChange={(v) => {
          if (v === "overview" || v === "trends") setView(v)
        }}
        className="gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="overview" className="px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends" className="px-3">
              Trends
            </TabsTrigger>
          </TabsList>

          {uncategorizedShare > 40 ? (
            <Button asChild variant="secondary" size="sm">
              <Link to="/transactions">
                Auto-categorize · {uncategorizedShare}% uncategorized
              </Link>
            </Button>
          ) : null}
        </div>

        {summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Income"
                value={formatINR(summary.totalCredit)}
                icon={<ArrowDownLeft className="size-4 text-emerald-600" />}
              />
              <StatCard
                label="Expenses"
                value={formatINR(summary.totalDebit)}
                icon={<ArrowUpRight className="size-4 text-rose-600" />}
              />
              <StatCard
                label="Net"
                value={formatINR(summary.net)}
                icon={<TrendingUp className="size-4 text-teal-700" />}
                accent={summary.net >= 0 ? "positive" : "negative"}
              />
            </div>

            {view === "overview" ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                  <Card className="flex h-full flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Spend by category
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col">
                      <div className="min-h-56 flex-1">
                        <CategoryPie data={categoryChartData} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {summary.byCategory.slice(0, 8).map((c) => (
                          <Link
                            key={c.categoryId}
                            to="/transactions"
                            search={{ category: c.categoryId }}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:bg-secondary/80 cursor-pointer transition-colors"
                            >
                              <span
                                className="mr-1.5 inline-block size-2 rounded-full"
                                style={{ background: c.color }}
                              />
                              {c.name} · {formatINR(c.amount, true)}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex h-full flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Category breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col">
                      <CategoryBars data={categoryChartData} />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                  <Card className="flex h-full flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Weekly income vs expense
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col">
                      <CashflowChart data={cashflow} />
                    </CardContent>
                  </Card>

                  <Card className="flex h-full flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Top merchants</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {summary.topMerchants.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No debits</p>
                      ) : (
                        summary.topMerchants.map((m) => (
                          <Link
                            key={m.merchant}
                            to="/transactions"
                            search={{ merchant: m.merchant }}
                            className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <MerchantAvatar
                                merchant={m.merchant}
                                categoryId={m.categoryId}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium group-hover:text-foreground">
                                  {m.merchant}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {m.count} txn{m.count === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                            <span className="flex shrink-0 items-center gap-1.5 font-medium tabular-nums">
                              {formatINR(m.amount)}
                              <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                          </Link>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {month ? (
                  <DashboardAiWidgets
                    transactions={transactions}
                    month={month}
                  />
                ) : null}
              </div>
            ) : null}

            {view === "trends" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Spend trends</CardTitle>
                    <div className="bg-muted inline-flex h-8 items-center rounded-lg p-[3px]">
                      <button
                        type="button"
                        onClick={() => setSpendGrain("daily")}
                        className={
                          spendGrain === "daily"
                            ? "bg-background text-foreground rounded-md px-2.5 py-0.5 text-sm font-medium shadow-sm"
                            : "text-muted-foreground hover:text-foreground rounded-md px-2.5 py-0.5 text-sm font-medium"
                        }
                      >
                        Daily
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpendGrain("weekly")}
                        className={
                          spendGrain === "weekly"
                            ? "bg-background text-foreground rounded-md px-2.5 py-0.5 text-sm font-medium shadow-sm"
                            : "text-muted-foreground hover:text-foreground rounded-md px-2.5 py-0.5 text-sm font-medium"
                        }
                      >
                        Weekly
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {spendGrain === "daily" ? (
                      <SpendBars data={daily} />
                    ) : (
                      <SpendBars data={weekly} />
                    )}
                  </CardContent>
                </Card>

                {month ? (
                  <TrendsInsights transactions={transactions} month={month} />
                ) : null}
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">
              {summary.txCount} transactions this month
            </p>
          </>
        ) : null}
      </Tabs>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent?: "positive" | "negative"
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-5">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p
            className={
              accent === "positive"
                ? "mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400"
                : accent === "negative"
                  ? "mt-1 text-xl font-semibold text-rose-600 dark:text-rose-400"
                  : "mt-1 text-xl font-semibold"
            }
          >
            {value}
          </p>
        </div>
        <div className="bg-muted rounded-lg p-2">{icon}</div>
      </CardContent>
    </Card>
  )
}
