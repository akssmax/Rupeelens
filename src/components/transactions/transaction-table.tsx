import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Tag,
  X,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MerchantAvatar } from "@/components/merchant-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildCategoryMap, CATEGORY_MAP, CUSTOM_CATEGORY_COLORS } from "@/lib/categories"
import { formatDisplayDate, formatINR } from "@/lib/format"
import {
  amountFilterMatches,
  buildActiveFilterLabels,
  buildFilterSummary,
  buildQuickFilterOptions,
  collectMerchantOptions,
  computeQuickFilterCounts,
  filterStateEquals,
  formatGroupLabel,
  globalFilterMatches,
  LARGE_SPEND_THRESHOLD,
  type QuickFilterId,
  type TransactionGroupBy,
  type TransactionTableFilterState,
} from "@/lib/transactions/table-logic"
import type { Category, CategoryId, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

export type { TransactionGroupBy, TransactionTableFilterState }
export { filterStateEquals }

export const TRANSACTION_GROUP_OPTIONS: Array<{
  value: TransactionGroupBy
  label: string
}> = [
  { value: "none", label: "No grouping" },
  { value: "merchant", label: "Merchant" },
  { value: "categoryId", label: "Category" },
  { value: "date", label: "Date" },
  { value: "type", label: "Income / expense" },
]

const NO_GROUPING: string[] = []
const SEARCH_DEBOUNCE_MS = 200

type AmountFilter = { min?: number; max?: number }

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function QuickFilterPill({
  label,
  icon: Icon,
  count,
  active,
  onClick,
  onClear,
}: {
  label: string
  icon: typeof Tag
  count: number
  active: boolean
  onClick: () => void
  onClear: () => void
}) {
  return (
    <div
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border/80 bg-background/80 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className="inline-flex h-full items-center gap-1.5 rounded-full pl-3 pr-1.5"
      >
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
        <span
          className={cn(
            "tabular-nums",
            active ? "text-foreground/70" : "text-muted-foreground/80",
          )}
        >
          {count}
        </span>
      </button>
      {active ? (
        <button
          type="button"
          aria-label={`Clear ${label} filter`}
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="text-foreground/70 hover:text-foreground inline-flex h-full items-center rounded-full pr-2 pl-0.5 transition-colors"
        >
          <X className="size-3.5 shrink-0" />
        </button>
      ) : null}
    </div>
  )
}

function amountCell(amount: number) {
  return (
    <span
      className={
        amount >= 0
          ? "block text-right font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
          : "block text-right font-medium text-rose-600 tabular-nums dark:text-rose-400"
      }
    >
      {formatINR(amount)}
    </span>
  )
}

function globalFilterFn(
  row: { original: Transaction },
  _columnId: string,
  filterValue: string,
) {
  return globalFilterMatches(row.original, filterValue)
}

function amountFilterFn(
  row: { original: Transaction; getValue: (id: string) => unknown },
  _columnId: string,
  filterValue: AmountFilter,
) {
  return amountFilterMatches(row.original, filterValue)
}

function SortableHeader<T>({
  column,
  children,
  className,
}: {
  column: Column<T, unknown>
  children: React.ReactNode
  className?: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8 font-medium", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUpDown className="text-muted-foreground size-3.5" />
      )}
    </Button>
  )
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onCreateCategory,
  toolbar = "full",
  initialFilters,
  filtersOpen = false,
  onActiveFiltersChange,
  groupBy = "none",
  onGroupByChange,
}: {
  transactions: Transaction[]
  categories: Category[]
  onCategoryChange?: (id: string, categoryId: CategoryId) => void
  onCreateCategory?: (name: string, color?: string) => Promise<Category | null>
  /** full = search, filters, sort, pagination; compact = sort + pagination only */
  toolbar?: "full" | "compact"
  initialFilters?: {
    merchant?: string
    categoryId?: CategoryId
  }
  filtersOpen?: boolean
  onActiveFiltersChange?: (state: TransactionTableFilterState) => void
  groupBy?: TransactionGroupBy
  onGroupByChange?: (groupBy: TransactionGroupBy) => void
}) {
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ])
  const [globalFilterInput, setGlobalFilterInput] = useState("")
  const globalFilter = useDebouncedValue(globalFilterInput, SEARCH_DEBOUNCE_MS)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = []
    if (initialFilters?.merchant) {
      filters.push({ id: "merchant", value: initialFilters.merchant })
    }
    if (initialFilters?.categoryId) {
      filters.push({ id: "categoryId", value: initialFilters.categoryId })
    }
    return filters
  })
  const [merchantFilter, setMerchantFilter] = useState(
    initialFilters?.merchant ?? "",
  )
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false)
  const [subscriptionsOnly, setSubscriptionsOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<"" | "credit" | "debit">("")
  const [largeOnly, setLargeOnly] = useState(false)
  const [transfersOnly, setTransfersOnly] = useState(false)
  const [investmentsOnly, setInvestmentsOnly] = useState(false)
  const [expanded, setExpanded] = useState<ExpandedState>(true)
  const [columnVisibility] = useState<VisibilityState>({
    type: false,
    needsReview: false,
    subscription: false,
    largeSpend: false,
    transfers: false,
    investments: false,
  })

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader column={column}>Date</SortableHeader>
        ),
        sortingFn: "datetime",
        enableGrouping: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-sm">
            {formatDisplayDate(row.original.date)}
          </span>
        ),
      },
      {
        id: "merchant",
        accessorFn: (row) => row.merchant || row.description,
        header: ({ column }) => (
          <SortableHeader column={column}>Merchant</SortableHeader>
        ),
        sortingFn: "alphanumeric",
        enableGrouping: true,
        filterFn: (row, _columnId, value) => {
          if (!value) return true
          const q = String(value).toLowerCase()
          const merchant = row.original.merchant?.toLowerCase() ?? ""
          return merchant === q
        },
        cell: ({ row }) => (
          <TransactionMerchantCell transaction={row.original} />
        ),
      },
      {
        accessorKey: "categoryId",
        header: ({ column }) => (
          <SortableHeader column={column}>Category</SortableHeader>
        ),
        sortingFn: (rowA, rowB) => {
          const a =
            categoryMap[rowA.original.categoryId]?.name ??
            rowA.original.categoryId
          const b =
            categoryMap[rowB.original.categoryId]?.name ??
            rowB.original.categoryId
          return a.localeCompare(b)
        },
        enableGrouping: true,
        filterFn: (row, columnId, value) =>
          !value || value === "all" || row.getValue(columnId) === value,
        cell: ({ row }) => (
          <TransactionCategoryCell
            transaction={row.original}
            categories={categories}
            categoryMap={categoryMap}
            onCategoryChange={onCategoryChange}
            onCreateCategory={onCreateCategory}
          />
        ),
      },
      {
        id: "amount",
        accessorFn: (row) => (row.credit > 0 ? row.credit : -row.debit),
        header: ({ column }) => (
          <SortableHeader column={column} className="ml-auto">
            Amount
          </SortableHeader>
        ),
        filterFn: amountFilterFn,
        aggregationFn: "sum",
        aggregatedCell: ({ getValue }) => amountCell(getValue<number>()),
        cell: ({ row }) => {
          const amount = row.getValue<number>("amount")
          return amountCell(amount)
        },
      },
      {
        id: "type",
        accessorFn: (row) => (row.debit > 0 ? "debit" : "credit"),
        enableHiding: true,
        enableGrouping: true,
        filterFn: (row, columnId, value) =>
          !value || value === "all" || row.getValue(columnId) === value,
      },
      {
        id: "needsReview",
        accessorFn: (row) =>
          row.categoryId === "uncategorized" || !row.merchant,
        enableHiding: true,
        filterFn: (row, columnId, value) =>
          !value || row.getValue(columnId) === true,
      },
      {
        id: "subscription",
        accessorFn: (row) => !!row.isSubscription,
        enableHiding: true,
        filterFn: (row, columnId, value) =>
          !value || row.getValue(columnId) === true,
      },
      {
        id: "largeSpend",
        accessorFn: (row) => row.debit >= LARGE_SPEND_THRESHOLD,
        enableHiding: true,
        filterFn: (row, columnId, value) =>
          !value || row.getValue(columnId) === true,
      },
      {
        id: "transfers",
        accessorFn: (row) => row.categoryId === "transfers",
        enableHiding: true,
        filterFn: (row, columnId, value) =>
          !value || row.getValue(columnId) === true,
      },
      {
        id: "investments",
        accessorFn: (row) => row.categoryId === "investments",
        enableHiding: true,
        filterFn: (row, columnId, value) =>
          !value || row.getValue(columnId) === true,
      },
    ],
    [categories, categoryMap, onCategoryChange, onCreateCategory],
  )

  const grouping = useMemo(
    () => (groupBy === "none" ? NO_GROUPING : [groupBy]),
    [groupBy],
  )

  const tableRef = useRef<ReturnType<typeof useReactTable<Transaction>> | null>(
    null,
  )

  const handleGlobalFilterChange = useCallback((value: string) => {
    setGlobalFilterInput(value)
    tableRef.current?.setPageIndex(0)
  }, [])

  const handleColumnFiltersChange = useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters(updater)
    },
    [],
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      grouping,
      expanded,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onExpandedChange: setExpanded,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetExpanded: false,
    initialState: {
      pagination: { pageSize: 50 },
    },
  })

  tableRef.current = table

  const categoryFilter =
    (table.getColumn("categoryId")?.getFilterValue() as string | undefined) ??
    "all"

  const merchantOptions = useMemo(
    () => collectMerchantOptions(transactions),
    [transactions],
  )

  const applyMerchantFilter = (value: string) => {
    const next = value === "all" ? "" : value
    setMerchantFilter(next)
    tableRef.current?.getColumn("merchant")?.setFilterValue(next || undefined)
    tableRef.current?.setPageIndex(0)
  }

  const applyAmountFilter = (min: string, max: string) => {
    const parsed: AmountFilter = {}
    const minN = min.trim() ? Number(min) : undefined
    const maxN = max.trim() ? Number(max) : undefined
    if (minN != null && !Number.isNaN(minN)) parsed.min = minN
    if (maxN != null && !Number.isNaN(maxN)) parsed.max = maxN
    tableRef.current
      ?.getColumn("amount")
      ?.setFilterValue(parsed.min || parsed.max ? parsed : undefined)
    tableRef.current?.setPageIndex(0)
  }

  const resetFilters = () => {
    setGlobalFilterInput("")
    setAmountMin("")
    setAmountMax("")
    setMerchantFilter("")
    setUncategorizedOnly(false)
    setSubscriptionsOnly(false)
    setTypeFilter("")
    setLargeOnly(false)
    setTransfersOnly(false)
    setInvestmentsOnly(false)
    tableRef.current?.resetColumnFilters()
    tableRef.current?.setGlobalFilter("")
    setSorting([{ id: "date", desc: true }])
    tableRef.current?.setPageIndex(0)
  }

  const clearQuickFilter = useCallback((id: QuickFilterId) => {
    switch (id) {
      case "needsReview":
        if (!uncategorizedOnly) return
        setUncategorizedOnly(false)
        tableRef.current
          ?.getColumn("needsReview")
          ?.setFilterValue(undefined)
        break
      case "subscriptions":
        if (!subscriptionsOnly) return
        setSubscriptionsOnly(false)
        tableRef.current
          ?.getColumn("subscription")
          ?.setFilterValue(undefined)
        break
      case "income":
        if (typeFilter !== "credit") return
        setTypeFilter("")
        tableRef.current?.getColumn("type")?.setFilterValue(undefined)
        break
      case "expenses":
        if (typeFilter !== "debit") return
        setTypeFilter("")
        tableRef.current?.getColumn("type")?.setFilterValue(undefined)
        break
      case "large":
        if (!largeOnly) return
        setLargeOnly(false)
        tableRef.current
          ?.getColumn("largeSpend")
          ?.setFilterValue(undefined)
        break
      case "transfers":
        if (!transfersOnly) return
        setTransfersOnly(false)
        tableRef.current
          ?.getColumn("transfers")
          ?.setFilterValue(undefined)
        break
      case "investments":
        if (!investmentsOnly) return
        setInvestmentsOnly(false)
        tableRef.current
          ?.getColumn("investments")
          ?.setFilterValue(undefined)
        break
    }
    tableRef.current?.setPageIndex(0)
  }, [
    uncategorizedOnly,
    subscriptionsOnly,
    typeFilter,
    largeOnly,
    transfersOnly,
    investmentsOnly,
  ])

  const toggleQuickFilter = useCallback((id: QuickFilterId) => {
    switch (id) {
      case "needsReview": {
        const next = !uncategorizedOnly
        setUncategorizedOnly(next)
        tableRef.current
          ?.getColumn("needsReview")
          ?.setFilterValue(next ? true : undefined)
        break
      }
      case "subscriptions": {
        const next = !subscriptionsOnly
        setSubscriptionsOnly(next)
        tableRef.current
          ?.getColumn("subscription")
          ?.setFilterValue(next ? true : undefined)
        break
      }
      case "income": {
        const next = typeFilter === "credit" ? "" : "credit"
        setTypeFilter(next)
        tableRef.current
          ?.getColumn("type")
          ?.setFilterValue(next || undefined)
        break
      }
      case "expenses": {
        const next = typeFilter === "debit" ? "" : "debit"
        setTypeFilter(next)
        tableRef.current
          ?.getColumn("type")
          ?.setFilterValue(next || undefined)
        break
      }
      case "large": {
        const next = !largeOnly
        setLargeOnly(next)
        tableRef.current
          ?.getColumn("largeSpend")
          ?.setFilterValue(next ? true : undefined)
        break
      }
      case "transfers": {
        const next = !transfersOnly
        setTransfersOnly(next)
        tableRef.current
          ?.getColumn("transfers")
          ?.setFilterValue(next ? true : undefined)
        break
      }
      case "investments": {
        const next = !investmentsOnly
        setInvestmentsOnly(next)
        tableRef.current
          ?.getColumn("investments")
          ?.setFilterValue(next ? true : undefined)
        break
      }
    }
    tableRef.current?.setPageIndex(0)
  }, [
    uncategorizedOnly,
    subscriptionsOnly,
    typeFilter,
    largeOnly,
    transfersOnly,
    investmentsOnly,
  ])

  const quickFilterCounts = useMemo(
    () => computeQuickFilterCounts(transactions),
    [transactions],
  )

  const quickFilters = useMemo(
    () =>
      buildQuickFilterOptions(quickFilterCounts, {
        needsReview: uncategorizedOnly,
        subscriptions: subscriptionsOnly,
        typeFilter,
        large: largeOnly,
        transfers: transfersOnly,
        investments: investmentsOnly,
      }),
    [
      quickFilterCounts,
      uncategorizedOnly,
      subscriptionsOnly,
      typeFilter,
      largeOnly,
      transfersOnly,
      investmentsOnly,
    ],
  )

  const filteredCount = table.getFilteredRowModel().rows.length

  const activeFilterLabels = useMemo(() => {
    if (toolbar !== "full") return []
    return buildActiveFilterLabels({
      globalFilter: globalFilterInput,
      merchantFilter,
      categoryFilter,
      categoryMap,
      amountMin,
      amountMax,
      uncategorizedOnly,
      subscriptionsOnly,
      typeFilter,
      largeOnly,
      transfersOnly,
      investmentsOnly,
    })
  }, [
    toolbar,
    globalFilterInput,
    merchantFilter,
    categoryFilter,
    categoryMap,
    amountMin,
    amountMax,
    uncategorizedOnly,
    subscriptionsOnly,
    typeFilter,
    largeOnly,
    transfersOnly,
    investmentsOnly,
  ])

  const hasActiveFilters = toolbar === "full" && activeFilterLabels.length > 0

  const filterSummary = useMemo(() => {
    if (!hasActiveFilters) return null
    const rows =
      tableRef.current?.getFilteredRowModel().rows.map((row) => row.original) ??
      []
    return buildFilterSummary(rows, transactions.length, activeFilterLabels)
  }, [activeFilterLabels, filteredCount, hasActiveFilters, transactions.length])

  const isGrouped = groupBy !== "none"
  const groupLabel =
    TRANSACTION_GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ??
    "Group"

  const lastFilterStateRef = useRef<TransactionTableFilterState | null>(null)

  useEffect(() => {
    if (groupBy === "none") return
    setExpanded(true)
    tableRef.current?.setPageIndex(0)
  }, [groupBy])

  useEffect(() => {
    if (!onActiveFiltersChange) return
    const next: TransactionTableFilterState = {
      active: hasActiveFilters,
      count: activeFilterLabels.length,
      labels: activeFilterLabels,
      filteredCount,
      totalCount: transactions.length,
    }
    const prev = lastFilterStateRef.current
    if (prev && filterStateEquals(prev, next)) return
    lastFilterStateRef.current = next
    onActiveFiltersChange(next)
  }, [
    activeFilterLabels,
    filteredCount,
    hasActiveFilters,
    onActiveFiltersChange,
    transactions.length,
  ])

  useEffect(() => {
    if (!initialFilters) return
    if (initialFilters.merchant) {
      setMerchantFilter(initialFilters.merchant)
      tableRef.current
        ?.getColumn("merchant")
        ?.setFilterValue(initialFilters.merchant)
    }
    if (initialFilters.categoryId) {
      tableRef.current
        ?.getColumn("categoryId")
        ?.setFilterValue(initialFilters.categoryId)
    }
  }, [initialFilters?.merchant, initialFilters?.categoryId])

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No transactions
      </p>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        toolbar === "full" && "min-h-0 flex-1",
      )}
    >
      {toolbar === "full" && filtersOpen ? (
        <div className="space-y-3 rounded-xl border bg-background/70 p-3">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <Input
              placeholder="Search description or merchant…"
              value={globalFilterInput}
              onChange={(e) => handleGlobalFilterChange(e.target.value)}
              className="min-w-[140px] flex-1"
            />
            <Select
              value={merchantFilter || "all"}
              onValueChange={applyMerchantFilter}
            >
              <SelectTrigger className="w-[150px] shrink-0">
                <SelectValue placeholder="Merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All merchants</SelectItem>
                {merchantOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                tableRef.current
                  ?.getColumn("categoryId")
                  ?.setFilterValue(v === "all" ? undefined : v)
                tableRef.current?.setPageIndex(0)
              }}
            >
              <SelectTrigger className="w-[150px] shrink-0">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="Min ₹"
              value={amountMin}
              onChange={(e) => {
                setAmountMin(e.target.value)
                applyAmountFilter(e.target.value, amountMax)
              }}
              className="w-20 shrink-0"
            />
            <Input
              type="number"
              min={0}
              placeholder="Max ₹"
              value={amountMax}
              onChange={(e) => {
                setAmountMax(e.target.value)
                applyAmountFilter(amountMin, e.target.value)
              }}
              className="w-20 shrink-0"
            />
          </div>
          <div className="border-border/60 flex items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {quickFilters.map((filter) => (
                <QuickFilterPill
                  key={filter.id}
                  label={filter.label}
                  icon={filter.icon}
                  count={filter.count}
                  active={filter.active}
                  onClick={() => toggleQuickFilter(filter.id)}
                  onClear={() => clearQuickFilter(filter.id)}
                />
              ))}
            </div>
            {!hasActiveFilters ? (
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {filteredCount} of {transactions.length} transactions
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasActiveFilters && filterSummary ? (
        <div className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-xl border px-3 py-2.5">
          <p className="text-foreground/90 min-w-0 flex-1 text-sm leading-snug">
            {filterSummary}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2"
            onClick={resetFilters}
          >
            <RotateCcw className="size-3.5" />
            Clear all
          </Button>
        </div>
      ) : null}

      {isGrouped ? (
        <div className="border-border/70 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="text-xs font-medium">
            Grouped by {groupLabel.toLowerCase()}
          </span>
          <Badge variant="secondary" className="font-normal">
            {table.getRowModel().rows.length} groups
          </Badge>
          {onGroupByChange ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7"
              onClick={() => onGroupByChange("none")}
            >
              <X className="size-3.5" />
              Clear grouping
            </Button>
          ) : null}
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {filteredCount} transactions
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "border-border/70 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background/80 transition-shadow",
          toolbar === "full" && "min-h-[16rem] flex-1",
          (hasActiveFilters || isGrouped) && "ring-primary/25 ring-1",
        )}
      >
        <Table
          containerClassName={cn(
            "min-h-0 overflow-auto",
            toolbar === "full" ? "flex-1" : "max-h-[min(70vh,720px)]",
          )}
        >
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background/95 [&_th]:backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "amount" ? "text-right" : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-muted-foreground h-24 text-center text-sm"
                >
                  No matching transactions
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.getIsGrouped() ? "bg-muted/30 hover:bg-muted/40" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "amount" ? "text-right" : undefined
                      }
                    >
                      {cell.getIsGrouped() ? (
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-2 text-left",
                            cell.column.id === "amount" && "ml-auto w-full justify-end",
                          )}
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {cell.column.id !== "amount" ? (
                            row.getIsExpanded() ? (
                              <ChevronDown className="size-4 shrink-0" />
                            ) : (
                              <ChevronRight className="size-4 shrink-0" />
                            )
                          ) : null}
                          {cell.column.id === "merchant" ? (
                            <MerchantAvatar
                              merchant={String(
                                row.getGroupingValue("merchant") ??
                                  row.getValue("merchant") ??
                                  "",
                              )}
                              description={row.subRows[0]?.original.description}
                              categoryId={row.subRows[0]?.original.categoryId}
                              className="size-7"
                            />
                          ) : null}
                          <span className="font-medium">
                            {formatGroupLabel(
                              cell.column.id,
                              row.getGroupingValue(cell.column.id) ??
                                row.getValue(cell.column.id),
                              categoryMap,
                            )}
                          </span>
                          {cell.column.id !== "amount" ? (
                            <Badge variant="secondary" className="font-normal">
                              {row.subRows.length}
                            </Badge>
                          ) : null}
                        </button>
                      ) : cell.getIsAggregated() ? (
                        flexRender(
                          cell.column.columnDef.aggregatedCell ??
                            cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      ) : cell.getIsPlaceholder() ? (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

const TransactionMerchantCell = memo(function TransactionMerchantCell({
  transaction: t,
}: {
  transaction: Transaction
}) {
  const title = t.merchant || t.description
  return (
    <div className="flex max-w-md items-center gap-3">
      <MerchantAvatar
        merchant={t.merchant}
        description={t.description}
        categoryId={t.categoryId}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {t.merchant ? (
          <p className="text-muted-foreground truncate text-xs">
            {t.description}
          </p>
        ) : null}
        {t.isSubscription ? (
          <Badge variant="secondary" className="mt-1">
            Subscription
          </Badge>
        ) : null}
      </div>
    </div>
  )
})

const TransactionCategoryCell = memo(function TransactionCategoryCell({
  transaction: t,
  categories,
  categoryMap,
  onCategoryChange,
  onCreateCategory,
}: {
  transaction: Transaction
  categories: Category[]
  categoryMap: Record<string, Category>
  onCategoryChange?: (id: string, categoryId: CategoryId) => void
  onCreateCategory?: (name: string, color?: string) => Promise<Category | null>
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(CUSTOM_CATEGORY_COLORS[0]!)
  const [creating, setCreating] = useState(false)

  if (onCategoryChange) {
    return (
      <>
        <Select
          value={t.categoryId}
          onValueChange={(v) => {
            if (v === "__new__") {
              setCreateOpen(true)
              return
            }
            onCategoryChange(t.id, v)
          }}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
            {onCreateCategory ? (
              <SelectItem value="__new__" className="text-primary">
                + New category…
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>

        {onCreateCategory ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor={`category-name-${t.id}`}>Name</Label>
                  <Input
                    id={`category-name-${t.id}`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Pet care"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {CUSTOM_CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Pick ${color}`}
                        className={cn(
                          "size-7 rounded-full border-2 transition-transform",
                          newColor === color
                            ? "scale-110 border-foreground"
                            : "border-transparent",
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!newName.trim() || creating}
                  onClick={() => {
                    void (async () => {
                      setCreating(true)
                      try {
                        const category = await onCreateCategory(
                          newName.trim(),
                          newColor,
                        )
                        if (category) {
                          onCategoryChange(t.id, category.id)
                          setNewName("")
                          setNewColor(CUSTOM_CATEGORY_COLORS[0]!)
                          setCreateOpen(false)
                        }
                      } finally {
                        setCreating(false)
                      }
                    })()
                  }}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    )
  }
  return (
    <Badge variant="secondary">
      {categoryMap[t.categoryId]?.name ?? CATEGORY_MAP[t.categoryId]?.name ?? t.categoryId}
    </Badge>
  )
})
