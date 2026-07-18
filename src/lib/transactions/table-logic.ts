import { getISOWeek, getISOWeekYear, parseISO } from "date-fns"
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Landmark,
  Repeat,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { buildCategoryMap } from "@/lib/categories"
import { formatDisplayDate, formatINR, formatINRAbs } from "@/lib/format"
import type { Category, Transaction } from "@/lib/types"

export const LARGE_SPEND_THRESHOLD = 5000

export type TransactionTableFilterState = {
  active: boolean
  count: number
  labels: string[]
  filteredCount: number
  totalCount: number
}

export type TransactionGroupBy = "none" | "merchant" | "categoryId" | "date" | "type"

export type QuickFilterId =
  | "needsReview"
  | "subscriptions"
  | "income"
  | "expenses"
  | "large"
  | "transfers"
  | "investments"

export type QuickFilterCounts = Record<QuickFilterId, number>

export type QuickFilterOption = {
  id: QuickFilterId
  label: string
  icon: LucideIcon
  count: number
  active: boolean
}

export type QuickFilterActiveState = {
  needsReview: boolean
  subscriptions: boolean
  typeFilter: "" | "credit" | "debit"
  large: boolean
  transfers: boolean
  investments: boolean
}

export type AmountFilter = { min?: number; max?: number }

export function filterStateEquals(
  a: TransactionTableFilterState,
  b: TransactionTableFilterState,
) {
  return (
    a.active === b.active &&
    a.count === b.count &&
    a.filteredCount === b.filteredCount &&
    a.totalCount === b.totalCount &&
    a.labels.length === b.labels.length &&
    a.labels.every((label, index) => label === b.labels[index])
  )
}

export function filterByWeek(transactions: Transaction[], weekKey: string) {
  return transactions.filter((t) => {
    const d = parseISO(t.date)
    const week = getISOWeek(d)
    const year = getISOWeekYear(d)
    const key = `${year}-W${String(week).padStart(2, "0")}`
    return key === weekKey
  })
}

export function globalFilterMatches(
  transaction: Transaction,
  filterValue: string,
): boolean {
  const q = filterValue.trim().toLowerCase()
  if (!q) return true
  return (
    transaction.description.toLowerCase().includes(q) ||
    (transaction.merchant?.toLowerCase().includes(q) ?? false)
  )
}

export function amountFilterMatches(
  transaction: Transaction,
  filterValue: AmountFilter,
): boolean {
  if (!filterValue?.min && !filterValue?.max) return true
  const amount = Math.abs(
    transaction.credit > 0 ? transaction.credit : transaction.debit,
  )
  if (filterValue.min != null && amount < filterValue.min) return false
  if (filterValue.max != null && amount > filterValue.max) return false
  return true
}

export function merchantFilterMatches(
  transaction: Transaction,
  merchant: string,
): boolean {
  if (!merchant) return true
  const q = merchant.toLowerCase()
  return (transaction.merchant?.toLowerCase() ?? "") === q
}

export function categoryFilterMatches(
  transaction: Transaction,
  categoryId: string | undefined,
): boolean {
  if (!categoryId || categoryId === "all") return true
  return transaction.categoryId === categoryId
}

export function typeFilterMatches(
  transaction: Transaction,
  type: "" | "credit" | "debit",
): boolean {
  if (!type) return true
  const txType = transaction.debit > 0 ? "debit" : "credit"
  return txType === type
}

export function quickFilterMatches(
  transaction: Transaction,
  id: QuickFilterId,
): boolean {
  switch (id) {
    case "needsReview":
      return transaction.categoryId === "uncategorized" || !transaction.merchant
    case "subscriptions":
      return !!transaction.isSubscription
    case "income":
      return transaction.credit > 0
    case "expenses":
      return transaction.debit > 0
    case "large":
      return transaction.debit >= LARGE_SPEND_THRESHOLD
    case "transfers":
      return transaction.categoryId === "transfers"
    case "investments":
      return transaction.categoryId === "investments"
  }
}

export function computeQuickFilterCounts(
  transactions: Transaction[],
): QuickFilterCounts {
  const counts: QuickFilterCounts = {
    needsReview: 0,
    subscriptions: 0,
    income: 0,
    expenses: 0,
    large: 0,
    transfers: 0,
    investments: 0,
  }

  for (const tx of transactions) {
    if (quickFilterMatches(tx, "needsReview")) counts.needsReview++
    if (quickFilterMatches(tx, "subscriptions")) counts.subscriptions++
    if (quickFilterMatches(tx, "income")) counts.income++
    if (quickFilterMatches(tx, "expenses")) counts.expenses++
    if (quickFilterMatches(tx, "large")) counts.large++
    if (quickFilterMatches(tx, "transfers")) counts.transfers++
    if (quickFilterMatches(tx, "investments")) counts.investments++
  }

  return counts
}

export function buildQuickFilterOptions(
  counts: QuickFilterCounts,
  active: QuickFilterActiveState,
): QuickFilterOption[] {
  const options: QuickFilterOption[] = [
    {
      id: "needsReview",
      label: "Needs review",
      icon: Tag,
      count: counts.needsReview,
      active: active.needsReview,
    },
    {
      id: "subscriptions",
      label: "Subscriptions",
      icon: Repeat,
      count: counts.subscriptions,
      active: active.subscriptions,
    },
    {
      id: "income",
      label: "Income",
      icon: ArrowUpRight,
      count: counts.income,
      active: active.typeFilter === "credit",
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: ArrowDownLeft,
      count: counts.expenses,
      active: active.typeFilter === "debit",
    },
    {
      id: "large",
      label: "₹5k+",
      icon: Banknote,
      count: counts.large,
      active: active.large,
    },
    {
      id: "transfers",
      label: "Transfers",
      icon: ArrowLeftRight,
      count: counts.transfers,
      active: active.transfers,
    },
    {
      id: "investments",
      label: "Investments",
      icon: Landmark,
      count: counts.investments,
      active: active.investments,
    },
  ]

  return options.filter((option) => option.count > 0)
}

export function buildActiveFilterLabels(input: {
  globalFilter: string
  merchantFilter: string
  categoryFilter: string
  categoryMap: Record<string, Category>
  amountMin: string
  amountMax: string
  uncategorizedOnly: boolean
  subscriptionsOnly: boolean
  typeFilter: "" | "credit" | "debit"
  largeOnly: boolean
  transfersOnly: boolean
  investmentsOnly: boolean
}): string[] {
  const labels: string[] = []
  if (input.globalFilter.trim()) {
    labels.push(`Search: “${input.globalFilter.trim()}”`)
  }
  if (input.merchantFilter) {
    labels.push(`Merchant: ${input.merchantFilter}`)
  }
  if (input.categoryFilter !== "all") {
    labels.push(
      `Category: ${input.categoryMap[input.categoryFilter]?.name ?? input.categoryFilter}`,
    )
  }
  if (input.amountMin.trim() || input.amountMax.trim()) {
    if (input.amountMin.trim() && input.amountMax.trim()) {
      labels.push(`Amount: ₹${input.amountMin}–₹${input.amountMax}`)
    } else if (input.amountMin.trim()) {
      labels.push(`Amount: ≥ ₹${input.amountMin}`)
    } else {
      labels.push(`Amount: ≤ ₹${input.amountMax}`)
    }
  }
  if (input.uncategorizedOnly) labels.push("Needs review")
  if (input.subscriptionsOnly) labels.push("Subscriptions")
  if (input.typeFilter === "credit") labels.push("Income")
  if (input.typeFilter === "debit") labels.push("Expenses")
  if (input.largeOnly) labels.push(`₹${LARGE_SPEND_THRESHOLD / 1000}k+ spends`)
  if (input.transfersOnly) labels.push("Transfers")
  if (input.investmentsOnly) labels.push("Investments")
  return labels
}

export function collectMerchantOptions(transactions: Transaction[]): string[] {
  const map = new Map<string, string>()
  for (const tx of transactions) {
    const name = tx.merchant?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!map.has(key)) map.set(key, name)
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b))
}

export function formatGroupLabel(
  columnId: string,
  value: unknown,
  categoryMap: Record<string, Category>,
): string {
  if (columnId === "categoryId") {
    return categoryMap[String(value)]?.name ?? String(value)
  }
  if (columnId === "date") {
    return formatDisplayDate(String(value))
  }
  if (columnId === "type") {
    return value === "credit" ? "Income" : "Expenses"
  }
  if (columnId === "merchant") {
    return String(value || "Unknown merchant")
  }
  return String(value ?? "Unknown")
}

export function buildFilterSummary(
  rows: Transaction[],
  total: number,
  labels: string[],
): string {
  if (rows.length === 0) {
    const hint =
      labels.length > 0
        ? labels
            .map((label) =>
              label
                .replace(/^Search: /, "")
                .replace(/^Merchant: /, "merchant ")
                .replace(/^Category: /, "category ")
                .toLowerCase(),
            )
            .join(", ")
        : "your filters"
    return `No transactions match ${hint}.`
  }

  const outflow = rows.reduce((sum, tx) => sum + tx.debit, 0)
  const inflow = rows.reduce((sum, tx) => sum + tx.credit, 0)
  const countText =
    rows.length === total
      ? `${rows.length} transaction${rows.length === 1 ? "" : "s"}`
      : `${rows.length} of ${total} transaction${total === 1 ? "" : "s"}`

  const segments = [`Showing ${countText}`]

  if (outflow > 0 && inflow > 0) {
    segments.push(`${formatINR(inflow)} in`, `${formatINRAbs(outflow)} out`)
  } else if (outflow > 0) {
    segments.push(`${formatINRAbs(outflow)} outflow`)
  } else if (inflow > 0) {
    segments.push(`${formatINR(inflow)} inflow`)
  }

  if (labels.length === 1) {
    const label = labels[0]!
    if (label.startsWith("Search: ")) {
      segments.push(`matching ${label.replace(/^Search: /, "").toLowerCase()}`)
    } else if (label.startsWith("Merchant: ")) {
      segments.push(`from ${label.slice(10)}`)
    } else if (label.startsWith("Category: ")) {
      segments.push(`in ${label.slice(10)}`)
    } else if (label.startsWith("Amount: ")) {
      segments.push(label.toLowerCase())
    } else {
      segments.push(label.toLowerCase())
    }
  } else if (labels.length > 1) {
    segments.push(
      labels
        .map((label) =>
          label
            .replace(/^Search: /, "")
            .replace(/^Merchant: /, "")
            .replace(/^Category: /, "")
            .replace(/^Amount: /, "")
            .toLowerCase(),
        )
        .join(", "),
    )
  }

  return segments.join(" · ")
}

export type TableFilterInput = {
  globalFilter: string
  merchantFilter: string
  categoryFilter: string
  amountFilter: AmountFilter
  uncategorizedOnly: boolean
  subscriptionsOnly: boolean
  typeFilter: "" | "credit" | "debit"
  largeOnly: boolean
  transfersOnly: boolean
  investmentsOnly: boolean
}

export function filterTransactionsForTable(
  transactions: Transaction[],
  filters: TableFilterInput,
): Transaction[] {
  return transactions.filter((tx) => {
    if (!globalFilterMatches(tx, filters.globalFilter)) return false
    if (!merchantFilterMatches(tx, filters.merchantFilter)) return false
    if (!categoryFilterMatches(tx, filters.categoryFilter)) return false
    if (!amountFilterMatches(tx, filters.amountFilter)) return false
    if (filters.uncategorizedOnly && !quickFilterMatches(tx, "needsReview")) {
      return false
    }
    if (filters.subscriptionsOnly && !quickFilterMatches(tx, "subscriptions")) {
      return false
    }
    if (!typeFilterMatches(tx, filters.typeFilter)) return false
    if (filters.largeOnly && !quickFilterMatches(tx, "large")) return false
    if (filters.transfersOnly && !quickFilterMatches(tx, "transfers")) {
      return false
    }
    if (filters.investmentsOnly && !quickFilterMatches(tx, "investments")) {
      return false
    }
    return true
  })
}

export function countUncategorized(transactions: Transaction[]): number {
  return computeQuickFilterCounts(transactions).needsReview
}

export function buildCategoryMapFromCategories(categories: Category[]) {
  return buildCategoryMap(categories)
}
