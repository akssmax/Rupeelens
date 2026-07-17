import { createFileRoute } from "@tanstack/react-router"
import { EmptyState } from "@/components/empty-state"
import { CreditsDebitsPageSkeleton } from "@/components/page-skeletons"
import { MonthSelect } from "@/components/month-select"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCallback, useState } from "react"
import type { CategoryId } from "@/lib/types"
import { useFinanceData } from "@/hooks/use-finance-data"
import { formatINR } from "@/lib/format"

export const Route = createFileRoute("/credits-debits")({
  component: CreditsDebitsPage,
})

function CreditsDebitsPage() {
  const {
    loading,
    transactions,
    categories,
    month,
    setMonth,
    months,
    flow,
    changeCategory,
  } = useFinanceData()
  const [tab, setTab] = useState<"debits" | "credits">("debits")

  const handleCategoryChange = useCallback(
    (id: string, categoryId: CategoryId) => {
      void changeCategory(id, categoryId)
    },
    [changeCategory],
  )

  if (loading) {
    return <CreditsDebitsPageSkeleton />
  }

  if (transactions.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Credits & Debits
          </h1>
          <p className="text-muted-foreground text-sm">
            Money in versus money out for the selected month
          </p>
        </div>
        <MonthSelect months={months} value={month} onChange={setMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">
              Total credits
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(flow.totalCredit)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {flow.credits.length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">
              Total debits
            </p>
            <p className="mt-1 text-xl font-semibold text-rose-600 dark:text-rose-400">
              {formatINR(flow.totalDebit)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {flow.debits.length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (v === "debits" || v === "credits") setTab(v)
        }}
      >
        <TabsList>
          <TabsTrigger value="debits">Debits</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {tab === "debits" ? (
            <TransactionTable
              transactions={flow.debits}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              toolbar="compact"
            />
          ) : (
            <TransactionTable
              transactions={flow.credits}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              toolbar="compact"
            />
          )}
        </div>
      </Tabs>
    </div>
  )
}
