import { useCallback, useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2, Sparkles } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { TransactionsPageSkeleton } from "@/components/page-skeletons"
import { MonthSelect } from "@/components/month-select"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { useCategorizeJob } from "@/components/upload/categorize-job-context"
import { Button } from "@/components/ui/button"
import { useFinanceData } from "@/hooks/use-finance-data"
import { filterByMonth } from "@/lib/analytics"
import type { CategoryId } from "@/lib/types"

type TransactionsSearch = {
  merchant?: string
  category?: CategoryId
}

export const Route = createFileRoute("/transactions")({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    merchant:
      typeof search.merchant === "string" && search.merchant.trim()
        ? search.merchant.trim()
        : undefined,
    category:
      typeof search.category === "string" && search.category.trim()
        ? (search.category as CategoryId)
        : undefined,
  }),
  component: TransactionsPage,
})

function TransactionsPage() {
  const { merchant, category } = Route.useSearch()
  const {
    loading,
    transactions,
    categories,
    month,
    setMonth,
    months,
    changeCategory,
  } = useFinanceData()
  const { job, startJob } = useCategorizeJob()
  const running = job.active

  const monthTransactions = useMemo(
    () => (month ? filterByMonth(transactions, month) : transactions),
    [transactions, month],
  )

  const initialFilters = useMemo(
    () =>
      merchant || category
        ? { merchant, categoryId: category }
        : undefined,
    [merchant, category],
  )

  const filterHint = useMemo(() => {
    if (merchant) return `Showing ${merchant} transactions`
    if (category) return `Filtered by category`
    return null
  }, [merchant, category])

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
    await startJob(transactions, {
      force,
      label: "Auto-categorizing transactions",
    })
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
            {filterHint ??
              `Auto-categorize with rules + Mistral · ${uncategorizedCount} still need work`}
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

      <TransactionTable
        transactions={monthTransactions}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        toolbar="full"
        initialFilters={initialFilters}
      />
    </div>
  )
}
