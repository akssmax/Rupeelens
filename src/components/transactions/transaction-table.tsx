import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Tag,
  Repeat,
  X,
} from "lucide-react"
import { memo, useEffect, useMemo, useState } from "react"
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
import { Toggle } from "@/components/ui/toggle"
import { buildCategoryMap, CATEGORY_MAP, CUSTOM_CATEGORY_COLORS } from "@/lib/categories"
import { formatDisplayDate, formatINR } from "@/lib/format"
import type { Category, CategoryId, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

type AmountFilter = { min?: number; max?: number }

function globalFilterFn(
  row: { original: Transaction },
  _columnId: string,
  filterValue: string,
) {
  const q = filterValue.trim().toLowerCase()
  if (!q) return true
  const t = row.original
  return (
    t.description.toLowerCase().includes(q) ||
    (t.merchant?.toLowerCase().includes(q) ?? false)
  )
}

function amountFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: AmountFilter,
) {
  if (!filterValue?.min && !filterValue?.max) return true
  const amount = Math.abs(row.getValue(columnId) as number)
  if (filterValue.min != null && amount < filterValue.min) return false
  if (filterValue.max != null && amount > filterValue.max) return false
  return true
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
}) {
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ])
  const [globalFilter, setGlobalFilter] = useState("")
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
  const [columnVisibility] = useState<VisibilityState>({
    type: false,
    needsReview: false,
    subscription: false,
  })

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader column={column}>Date</SortableHeader>
        ),
        sortingFn: "datetime",
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
        cell: ({ row }) => {
          const amount = row.getValue<number>("amount")
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
        },
      },
      {
        id: "type",
        accessorFn: (row) => (row.debit > 0 ? "debit" : "credit"),
        enableHiding: true,
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
    ],
    [categories, categoryMap, onCategoryChange, onCreateCategory],
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 50 },
    },
  })

  const categoryFilter =
    (table.getColumn("categoryId")?.getFilterValue() as string | undefined) ??
    "all"

  const merchantOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of transactions) {
      const name = t.merchant?.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) map.set(key, name)
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const applyMerchantFilter = (value: string) => {
    const next = value === "all" ? "" : value
    setMerchantFilter(next)
    table.getColumn("merchant")?.setFilterValue(next || undefined)
  }

  const applyAmountFilter = (min: string, max: string) => {
    const parsed: AmountFilter = {}
    const minN = min.trim() ? Number(min) : undefined
    const maxN = max.trim() ? Number(max) : undefined
    if (minN != null && !Number.isNaN(minN)) parsed.min = minN
    if (maxN != null && !Number.isNaN(maxN)) parsed.max = maxN
    table
      .getColumn("amount")
      ?.setFilterValue(parsed.min || parsed.max ? parsed : undefined)
  }

  const resetFilters = () => {
    setGlobalFilter("")
    setAmountMin("")
    setAmountMax("")
    setMerchantFilter("")
    setUncategorizedOnly(false)
    setSubscriptionsOnly(false)
    table.resetColumnFilters()
    table.setGlobalFilter("")
    setSorting([{ id: "date", desc: true }])
    table.setPageIndex(0)
  }

  const filteredCount = table.getFilteredRowModel().rows.length

  useEffect(() => {
    table.setPageIndex(0)
  }, [globalFilter, columnFilters, table])

  useEffect(() => {
    if (!initialFilters) return
    if (initialFilters.merchant) {
      setMerchantFilter(initialFilters.merchant)
      table.getColumn("merchant")?.setFilterValue(initialFilters.merchant)
    }
    if (initialFilters.categoryId) {
      table
        .getColumn("categoryId")
        ?.setFilterValue(initialFilters.categoryId)
    }
  }, [initialFilters, table])

  const hasActiveFilters =
    toolbar === "full" &&
    (globalFilter ||
      merchantFilter ||
      categoryFilter !== "all" ||
      amountMin ||
      amountMax ||
      uncategorizedOnly ||
      subscriptionsOnly)

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No transactions
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {toolbar === "full" ? (
        <div className="space-y-3 rounded-xl border bg-background/70 p-3">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <Input
              placeholder="Search description or merchant…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
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
              onValueChange={(v) =>
                table
                  .getColumn("categoryId")
                  ?.setFilterValue(v === "all" ? undefined : v)
              }
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
              <Toggle
                variant="outline"
                size="sm"
                pressed={uncategorizedOnly}
                onPressedChange={(pressed) => {
                  setUncategorizedOnly(pressed)
                  table
                    .getColumn("needsReview")
                    ?.setFilterValue(pressed ? true : undefined)
                }}
                aria-label="Uncategorized only"
              >
                <Tag className="size-3.5" data-icon="inline-start" />
                Needs review
                {uncategorizedOnly ? (
                  <X className="size-3.5" data-icon="inline-end" />
                ) : null}
              </Toggle>
              <Toggle
                variant="outline"
                size="sm"
                pressed={subscriptionsOnly}
                onPressedChange={(pressed) => {
                  setSubscriptionsOnly(pressed)
                  table
                    .getColumn("subscription")
                    ?.setFilterValue(pressed ? true : undefined)
                }}
                aria-label="Subscriptions only"
              >
                <Repeat className="size-3.5" data-icon="inline-start" />
                Subscriptions
                {subscriptionsOnly ? (
                  <X className="size-3.5" data-icon="inline-end" />
                ) : null}
              </Toggle>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="size-3.5" />
                  Reset filters
                </Button>
              ) : null}
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {filteredCount} of {transactions.length} transactions
            </span>
          </div>
        </div>
      ) : null}

      <div className="border-border/70 overflow-hidden rounded-xl border bg-background/80">
        <Table>
          <TableHeader>
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
