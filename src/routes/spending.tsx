import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { SpendBars } from "@/components/charts/spend-bars"
import { EmptyState } from "@/components/empty-state"
import { MonthSelect } from "@/components/month-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFinanceData } from "@/hooks/use-finance-data"
import { formatINR, formatMonthLabel } from "@/lib/format"

export const Route = createFileRoute("/spending")({ component: SpendingPage })

function SpendingPage() {
  const { loading, transactions, month, setMonth, months, weekly, daily } =
    useFinanceData()
  const [grain, setGrain] = useState<"weekly" | "daily">("weekly")

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>
  }

  if (transactions.length === 0) {
    return <EmptyState />
  }

  const weekTotal = weekly.reduce((s, w) => s + w.amount, 0)
  const dayPeak = daily.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    { date: "", label: "—", amount: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Spending
          </h1>
          <p className="text-muted-foreground text-sm">
            Weekly and daily debits for{" "}
            {month ? formatMonthLabel(month) : "the selected month"}
          </p>
        </div>
        <MonthSelect months={months} value={month} onChange={setMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">
              Month spend
            </p>
            <p className="mt-1 text-xl font-semibold">{formatINR(weekTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">
              Peak day
            </p>
            <p className="mt-1 text-xl font-semibold">
              {dayPeak.amount > 0
                ? `${formatINR(dayPeak.amount)} · ${dayPeak.label}`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={grain}
        onValueChange={(v) => {
          if (v === "weekly" || v === "daily") setGrain(v)
        }}
      >
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              {grain === "weekly" ? "Weekly spends" : "Daily spends"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grain === "weekly" ? (
              <SpendBars data={weekly} />
            ) : (
              <SpendBars data={daily} />
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
