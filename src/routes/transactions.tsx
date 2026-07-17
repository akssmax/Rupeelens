import { useCallback, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { TransactionsPageSkeleton } from "@/components/page-skeletons"
import { MonthSelect } from "@/components/month-select"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useFinanceData } from "@/hooks/use-finance-data"
import { filterByMonth } from "@/lib/analytics"
import type { CategoryId } from "@/lib/types"
import {
  runCategorization,
  type CategorizeProgress,
} from "@/lib/categorize-client"

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
})

function TransactionsPage() {
  const {
    loading,
    transactions,
    categories,
    month,
    setMonth,
    months,
    changeCategory,
    refresh,
  } = useFinanceData()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<CategorizeProgress | null>(null)

  const monthTransactions = useMemo(
    () => (month ? filterByMonth(transactions, month) : transactions),
    [transactions, month],
  )

  const uncategorizedCount = useMemo(
    () =>
      transactions.filter(
        (t) => t.categoryId === "uncategorized" || !t.merchant,
      ).length,
    [transactions],
  )

  const handleCategoryChange = useCallback(
    (id: string, categoryId: CategoryId) => {
      void changeCategory(id, categoryId)
    },
    [changeCategory],
  )

  const autoCategorize = async (force = false) => {
    setRunning(true)
    setProgress({
      phase: "rules",
      done: 0,
      total: transactions.length,
      label: "Starting…",
    })
    try {
      const result = await runCategorization(
        transactions,
        (p) => setProgress(p),
        { force },
      )
      await refresh()
      if (result.errors.length) {
        toast.warning(
          `Categorized ${result.updated} (rules ${result.rules}, memory ${result.memory}, AI ${result.llm}). AI note: ${result.errors[0]}`,
        )
      } else {
        toast.success(
          `Categorized ${result.updated} — rules ${result.rules}, memory ${result.memory}, AI ${result.llm}`,
        )
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  if (loading) {
    return <TransactionsPageSkeleton />
  }

  if (transactions.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground text-sm">
            Auto-categorize with rules + Mistral · {uncategorizedCount} still
            need work
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelect months={months} value={month} onChange={setMonth} />
          <Button
            onClick={() => void autoCategorize(false)}
            disabled={running || uncategorizedCount === 0}
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Auto-categorize
          </Button>
        </div>
      </div>

      {progress ? (
        <div className="space-y-2 rounded-xl border bg-background/70 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progress.label}</span>
            <span className="tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </div>
          <Progress
            value={
              progress.total
                ? Math.round((progress.done / progress.total) * 100)
                : 0
            }
          />
        </div>
      ) : null}

      <TransactionTable
        transactions={monthTransactions}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        toolbar="full"
      />
    </div>
  )
}
