import { describe, expect, it } from "vitest"
import type { Transaction } from "@/lib/types"
import {
  buildActiveFilterLabels,
  buildFilterSummary,
  buildQuickFilterOptions,
  collectMerchantOptions,
  computeQuickFilterCounts,
  filterTransactionsForTable,
} from "./table-logic"

const PERF = {
  rows: 10_000,
  iterations: 15,
  countMs: 20,
  filterMs: 35,
  summaryMs: 25,
  merchantOptionsMs: 20,
  activeLabelsMs: 5,
}

function makeTransactions(count: number): Transaction[] {
  const merchants = [
    "Bistro",
    "Gk Wines",
    "Netflix",
    "Swiggy",
    "Blinkit",
    "Safe Gold",
    "Vinod",
  ]
  const categories = [
    "uncategorized",
    "food",
    "wine",
    "subscriptions",
    "groceries",
    "investments",
    "transfers",
  ] as const

  return Array.from({ length: count }, (_, index) => {
    const merchant = merchants[index % merchants.length]!
    const categoryId = categories[index % categories.length]!
    const debit = index % 5 === 0 ? 0 : 100 + (index % 9000)
    const credit = index % 5 === 0 ? 5000 + (index % 1000) : 0
    return {
      id: `tx_${index}`,
      statementId: "stmt_perf",
      date: `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
      description: `UPI/P2M/${index}/${merchant}/HDFC BANK LTD`,
      merchant,
      categoryId,
      debit,
      credit,
      amount: credit > 0 ? credit : -debit,
      isSubscription: categoryId === "subscriptions",
    }
  })
}

function averageMs(fn: () => void, iterations = PERF.iterations) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  return (performance.now() - start) / iterations
}

describe("transactions table performance", () => {
  const transactions = makeTransactions(PERF.rows)

  it(`computes quick filter counts for ${PERF.rows.toLocaleString()} rows`, () => {
    const ms = averageMs(() => computeQuickFilterCounts(transactions))
    expect(ms).toBeLessThan(PERF.countMs)
  })

  it(`filters ${PERF.rows.toLocaleString()} rows with search + quick filters`, () => {
    const ms = averageMs(() =>
      filterTransactionsForTable(transactions, {
        globalFilter: "bistro",
        merchantFilter: "",
        categoryFilter: "all",
        amountFilter: { min: 500 },
        uncategorizedOnly: true,
        subscriptionsOnly: false,
        typeFilter: "",
        largeOnly: false,
        transfersOnly: false,
        investmentsOnly: false,
      }),
    )
    expect(ms).toBeLessThan(PERF.filterMs)
  })

  it(`builds filter summary for a filtered subset`, () => {
    const filtered = filterTransactionsForTable(transactions, {
      globalFilter: "",
      merchantFilter: "",
      categoryFilter: "all",
      amountFilter: {},
      uncategorizedOnly: true,
      subscriptionsOnly: false,
      typeFilter: "debit",
      largeOnly: false,
      transfersOnly: false,
      investmentsOnly: false,
    })
    const labels = buildActiveFilterLabels({
      globalFilter: "",
      merchantFilter: "",
      categoryFilter: "all",
      categoryMap: {},
      amountMin: "",
      amountMax: "",
      uncategorizedOnly: true,
      subscriptionsOnly: false,
      typeFilter: "debit",
      largeOnly: false,
      transfersOnly: false,
      investmentsOnly: false,
    })

    const ms = averageMs(() =>
      buildFilterSummary(filtered, transactions.length, labels),
    )
    expect(ms).toBeLessThan(PERF.summaryMs)
  })

  it(`collects merchant options for ${PERF.rows.toLocaleString()} rows`, () => {
    const ms = averageMs(() => collectMerchantOptions(transactions))
    expect(ms).toBeLessThan(PERF.merchantOptionsMs)
  })

  it("builds quick filter options without rescanning transactions", () => {
    const counts = computeQuickFilterCounts(transactions)
    const ms = averageMs(() =>
      buildQuickFilterOptions(counts, {
        needsReview: true,
        subscriptions: false,
        typeFilter: "debit",
        large: false,
        transfers: false,
        investments: false,
      }),
    )
    expect(ms).toBeLessThan(PERF.activeLabelsMs)
  })
})
