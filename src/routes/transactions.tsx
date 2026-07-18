import { useCallback, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { DrillDownPageHeader } from "@/components/drill-down-page-header"
import { EmptyState } from "@/components/empty-state"
import { TransactionsPageSkeleton } from "@/components/page-skeletons"
import { TransactionPageActions } from "@/components/transactions/transaction-page-actions"
import {
  TransactionTable,
  filterStateEquals,
  type TransactionGroupBy,
  type TransactionTableFilterState,
} from "@/components/transactions/transaction-table"
import { useCategorizeJob } from "@/components/upload/categorize-job-context"
import { useFinanceData } from "@/hooks/use-finance-data"
import { filterByMonth } from "@/lib/analytics"
import { resolveCategoryName } from "@/lib/categories"
import { filterTransactionsForExport } from "@/lib/export-transactions"
import { formatDisplayDate } from "@/lib/format"
import {
  countUncategorized,
  filterByWeek,
} from "@/lib/transactions/table-logic"
import type { CategoryId } from "@/lib/types"

type TransactionsSearch = {
  merchant?: string
  category?: CategoryId
  date?: string
  week?: string
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
    createCategory,
  } = useFinanceData()
  const { job, startJob } = useCategorizeJob()
  const running = job.active
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<TransactionGroupBy>("none")
  const [filterState, setFilterState] = useState<TransactionTableFilterState>({
    active: false,
    count: 0,
    labels: [],
    filteredCount: 0,
    totalCount: 0,
  })
  const handleActiveFiltersChange = useCallback(
    (state: TransactionTableFilterState) => {
      setFilterState((prev) =>
        filterStateEquals(prev, state) ? prev : state,
      )
    },
    [],
  )

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
      const name = resolveCategoryName(
        category,
        Object.fromEntries(categories.map((c) => [c.id, c])),
      )
      return `Showing ${name} transactions`
    }
    if (date) return `Showing ${formatDisplayDate(date)}`
    if (week) return `Showing week ${week.split("-W")[1]} transactions`
    return null
  }, [merchant, category, date, week, categories])

  const isFilteredView = Boolean(filterHint)

  const uncategorizedCount = useMemo(
    () => countUncategorized(transactions),
    [transactions],
  )

  const handleCategoryChange = useCallback(
    (id: string, categoryId: CategoryId) => {
      void changeCategory(id, categoryId)
    },
    [changeCategory],
  )

  const autoCategorize = useCallback(
    async (force = false) => {
      await startJob(transactions, {
        force,
        label: force ? "Re-categorizing transactions" : "Auto-categorizing transactions",
      })
    },
    [startJob, transactions],
  )

  const exportRows = useMemo(
    () =>
      filterTransactionsForExport(monthTransactions, {
        merchant,
        categoryId: category,
      }),
    [monthTransactions, merchant, category],
  )

  const exportTitle = filterHint ?? `Transactions ${month}`
  const exportFilename = useMemo(() => {
    if (month) return `transactions-${month}`
    return "transactions"
  }, [month])

  const headerActions = (
    <TransactionPageActions
      months={months}
      month={month}
      onMonthChange={setMonth}
      uncategorizedCount={uncategorizedCount}
      running={running}
      onAutoCategorize={(force) => void autoCategorize(force)}
      exportRows={exportRows}
      categories={categories}
      exportTitle={exportTitle}
      exportFilename={exportFilename}
      filtersOpen={filtersOpen}
      onFiltersOpenChange={setFiltersOpen}
      activeFilterCount={filterState.count}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
    />
  )

  if (loading) {
    return <TransactionsPageSkeleton />
  }

  if (transactions.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {isFilteredView ? (
        <div className="shrink-0">
          <DrillDownPageHeader
            title={filterHint!}
            actions={headerActions}
          />
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Transactions
            </h1>
            <p className="text-muted-foreground text-sm">
              Auto-categorize with rules + Mistral · {uncategorizedCount} still
              need work
            </p>
          </div>
          {headerActions}
        </div>
      )}

      <TransactionTable
        transactions={monthTransactions}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        onCreateCategory={createCategory}
        toolbar="full"
        initialFilters={initialFilters}
        filtersOpen={filtersOpen}
        onActiveFiltersChange={handleActiveFiltersChange}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />
    </div>
  )
}
