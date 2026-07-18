import { describe, expect, it } from "vitest"
import { CATEGORY_MAP } from "@/lib/categories"
import type { Transaction } from "@/lib/types"
import {
  buildActiveFilterLabels,
  buildFilterSummary,
  buildQuickFilterOptions,
  collectMerchantOptions,
  computeQuickFilterCounts,
  filterByWeek,
  filterStateEquals,
  filterTransactionsForTable,
  formatGroupLabel,
  globalFilterMatches,
  merchantFilterMatches,
  quickFilterMatches,
} from "./table-logic"

function makeTx(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "description">,
): Transaction {
  const debit = overrides.debit ?? 250
  const credit = overrides.credit ?? 0
  return {
    statementId: "stmt_test",
    date: "2026-05-31",
    debit,
    credit,
    amount: credit > 0 ? credit : -debit,
    categoryId: "uncategorized",
    ...overrides,
  }
}

describe("filterStateEquals", () => {
  it("detects identical filter state", () => {
    const state = {
      active: true,
      count: 2,
      labels: ["Needs review", "Income"],
      filteredCount: 10,
      totalCount: 100,
    }
    expect(filterStateEquals(state, { ...state })).toBe(true)
  })

  it("detects label changes", () => {
    const a = {
      active: true,
      count: 1,
      labels: ["Needs review"],
      filteredCount: 10,
      totalCount: 100,
    }
    const b = { ...a, labels: ["Income"] }
    expect(filterStateEquals(a, b)).toBe(false)
  })
})

describe("globalFilterMatches", () => {
  it("matches merchant and description case-insensitively", () => {
    const tx = makeTx({
      id: "1",
      description: "UPI/P2M/123/BISTRO/HDFC",
      merchant: "Bistro",
    })
    expect(globalFilterMatches(tx, "bistro")).toBe(true)
    expect(globalFilterMatches(tx, "upi")).toBe(true)
    expect(globalFilterMatches(tx, "zomato")).toBe(false)
  })
})

describe("quick filter helpers", () => {
  const txs = [
    makeTx({ id: "1", description: "a", merchant: "Bistro" }),
    makeTx({
      id: "2",
      description: "b",
      merchant: "Netflix",
      categoryId: "subscriptions",
      isSubscription: true,
    }),
    makeTx({
      id: "3",
      description: "c",
      merchant: "Salary",
      credit: 50000,
      debit: 0,
      categoryId: "salary",
    }),
    makeTx({
      id: "4",
      description: "d",
      merchant: "Broker",
      debit: 6000,
      categoryId: "investments",
    }),
  ]

  it("counts quick filter buckets", () => {
    expect(computeQuickFilterCounts(txs)).toMatchObject({
      needsReview: 1,
      subscriptions: 1,
      income: 1,
      expenses: 3,
      large: 1,
      investments: 1,
    })
  })

  it("builds only non-zero quick filter pills", () => {
    const options = buildQuickFilterOptions(computeQuickFilterCounts(txs), {
      needsReview: true,
      subscriptions: false,
      typeFilter: "",
      large: false,
      transfers: false,
      investments: false,
    })
    expect(options.some((option) => option.id === "needsReview" && option.active)).toBe(
      true,
    )
    expect(options.every((option) => option.count > 0)).toBe(true)
  })
})

describe("buildFilterSummary", () => {
  it("summarizes filtered rows with inflow and outflow", () => {
    const rows = [
      makeTx({ id: "1", description: "a", debit: 100, merchant: "A" }),
      makeTx({
        id: "2",
        description: "b",
        debit: 0,
        credit: 200,
        merchant: "B",
        categoryId: "salary",
      }),
    ]
    const summary = buildFilterSummary(rows, 10, ["Needs review"])
    expect(summary).toContain("2 of 10")
    expect(summary).toContain("₹")
    expect(summary).toContain("needs review")
  })

  it("handles empty matches", () => {
    expect(buildFilterSummary([], 5, ["Merchant: Bistro"])).toBe(
      "No transactions match merchant bistro.",
    )
  })
})

describe("filterTransactionsForTable", () => {
  const txs = [
    makeTx({ id: "1", description: "food", merchant: "Bistro" }),
    makeTx({
      id: "2",
      description: "wine",
      merchant: "Gk Wines",
      categoryId: "wine",
    }),
  ]

  it("combines search and quick filters", () => {
    const filtered = filterTransactionsForTable(txs, {
      globalFilter: "bistro",
      merchantFilter: "",
      categoryFilter: "all",
      amountFilter: {},
      uncategorizedOnly: true,
      subscriptionsOnly: false,
      typeFilter: "",
      largeOnly: false,
      transfersOnly: false,
      investmentsOnly: false,
    })
    expect(filtered.map((tx) => tx.id)).toEqual(["1"])
  })

  it("filters by merchant exactly", () => {
    const filtered = filterTransactionsForTable(txs, {
      globalFilter: "",
      merchantFilter: "Gk Wines",
      categoryFilter: "all",
      amountFilter: {},
      uncategorizedOnly: false,
      subscriptionsOnly: false,
      typeFilter: "",
      largeOnly: false,
      transfersOnly: false,
      investmentsOnly: false,
    })
    expect(filtered).toHaveLength(1)
    expect(merchantFilterMatches(filtered[0]!, "Gk Wines")).toBe(true)
  })
})

describe("collectMerchantOptions", () => {
  it("returns sorted unique merchants", () => {
    const options = collectMerchantOptions([
      makeTx({ id: "1", description: "a", merchant: "Zomato" }),
      makeTx({ id: "2", description: "b", merchant: "Bistro" }),
      makeTx({ id: "3", description: "c", merchant: "bistro" }),
    ])
    expect(options).toEqual(["Bistro", "Zomato"])
  })
})

describe("formatGroupLabel", () => {
  it("formats category and type labels", () => {
    expect(formatGroupLabel("categoryId", "food", CATEGORY_MAP)).toBe("Food")
    expect(formatGroupLabel("type", "credit", CATEGORY_MAP)).toBe("Income")
  })
})

describe("filterByWeek", () => {
  it("filters transactions by ISO week key", () => {
    const txs = [
      makeTx({ id: "1", description: "a", date: "2026-05-31" }),
      makeTx({ id: "2", description: "b", date: "2026-06-01" }),
    ]
    const filtered = filterByWeek(txs, "2026-W22")
    expect(filtered.map((tx) => tx.id)).toEqual(["1"])
  })
})

describe("buildActiveFilterLabels", () => {
  it("builds human-readable active filter labels", () => {
    const labels = buildActiveFilterLabels({
      globalFilter: "bistro",
      merchantFilter: "Bistro",
      categoryFilter: "food",
      categoryMap: CATEGORY_MAP,
      amountMin: "100",
      amountMax: "",
      uncategorizedOnly: true,
      subscriptionsOnly: false,
      typeFilter: "",
      largeOnly: false,
      transfersOnly: false,
      investmentsOnly: false,
    })
    expect(labels).toContain("Search: “bistro”")
    expect(labels).toContain("Merchant: Bistro")
    expect(labels).toContain("Category: Food")
    expect(labels).toContain("Needs review")
    expect(labels).toContain("Amount: ≥ ₹100")
  })
})

describe("quickFilterMatches", () => {
  it("flags needs review transactions", () => {
    const tx = makeTx({ id: "1", description: "x" })
    expect(quickFilterMatches(tx, "needsReview")).toBe(true)
  })
})
