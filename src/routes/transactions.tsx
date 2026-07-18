import { useCallback, useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns"
import { Loader2, Sparkles } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { TransactionsPageSkeleton } from "@/components/page-skeletons"
import { MonthSelect } from "@/components/month-select"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { useCategorizeJob } from "@/components/upload/categorize-job-context"
import { Button } from "@/components/ui/button"
import { useFinanceData } from "@/hooks/use-finance-data"
import { filterByMonth } from "@/lib/analytics"
import { CATEGORY_MAP } from "@/lib/categories"
import { formatDisplayDate } from "@/lib/format"
import type { CategoryId } from "@/lib/types"

type TransactionsSearch = {
  merchant?: string
  category?: CategoryId
  date?: string
  week?: string
}

function filterByWeek(txs: ReturnType<typeof filterByMonth>, weekKey: string) {
  return txs.filter((t) => {
    const d = parseISO(t.date)
    const week = getISOWeek(d)
    const year = getISOWeekYear(d)
    const key = `${year}-W${String(week).padStart(2, "0")}`
    return key === weekKey
  })
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
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
    week:
      typeof search.week === "string" && /^\d{4}-W\d{2}$/.test(search.week)
        ? search.week
        : undefined,
  }),
  component: TransactionsPage,
})

function TransactionsPage() {
  const { merchant, category, date, week } = Route.useSearch()
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

  const monthTransactions = useMemo(() => {
    let rows = month ? filterByMonth(transactions, month) : transactions
    if (date) rows = rows.filter((t) => t.date === date)
    if (week) rows = filterByWeek(rows, week)
    return rows
  }, [transactions, month, date, week])

  const initialFilters = useMemo(
    () =>
      merchant || category
        ? { merchant, categoryId: category }
        : undefined,
    [merchant, category],
  )

  const filterHint = useMemo(() => {
    if (merchant) return `Showing ${merchant} transactions`
    if (category) {
      const name = CATEGORY_MAP[category]?.name ?? category
      return `Showing ${name} transactions`
    }
    if (date) return `Showing ${formatDisplayDate(date)}`
    if (week) return `Showing week ${week.split("-W")[1]} transactions`
    return null
  }, [merchant, category, date, week])

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
