import { describe, expect, it } from "vitest"
import {
  looksLikeCategorizationRequest,
  matchUncategorizedTransactions,
  previewCategorizationActions,
} from "./chat-categorize"
import type { Transaction } from "./types"

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

describe("chat categorization matching", () => {
  const bistroUpi =
    "UPI/P2M/708476283828/BISTRO /UPIInt/HDFC BANK LTD"

  const transactions: Transaction[] = [
    makeTx({
      id: "1",
      description: bistroUpi,
      merchant: "Bistro",
    }),
    makeTx({
      id: "2",
      description: bistroUpi,
      merchant: "Bistro",
      date: "2026-05-27",
    }),
    makeTx({
      id: "3",
      description: bistroUpi,
      merchant: "Bistro",
      categoryId: "food",
    }),
    makeTx({
      id: "4",
      description: "UPI/P2M/123/GK WINES /Pay vi/HDFC BANK LTD",
      merchant: "Gk Wines",
    }),
  ]

  it("matches Bistro uncategorized UPI transactions", () => {
    const matched = matchUncategorizedTransactions(transactions, "Bistro")
    expect(matched.map((tx) => tx.id)).toEqual(["1", "2"])
  })

  it("does not match already categorized transactions", () => {
    const matched = matchUncategorizedTransactions(transactions, "food")
    expect(matched).toHaveLength(0)
  })

  it("matches multi-word merchant queries", () => {
    const matched = matchUncategorizedTransactions(transactions, "Gk Wines")
    expect(matched.map((tx) => tx.id)).toEqual(["4"])
  })

  it("returns zero matches for unknown merchants", () => {
    const matched = matchUncategorizedTransactions(transactions, "Zomato")
    expect(matched).toHaveLength(0)
  })

  it("builds previews with skipped reasons for empty matches", () => {
    const previews = previewCategorizationActions(transactions, [
      {
        merchantQuery: "Bistro",
        categoryId: "food",
        categoryName: "Food",
      },
      {
        merchantQuery: "Zomato",
        categoryId: "food",
        categoryName: "Food",
      },
    ])

    expect(previews[0]?.matched).toHaveLength(2)
    expect(previews[1]?.matched).toHaveLength(0)
    expect(previews[1]?.skippedReason).toContain("Zomato")
  })
})

describe("looksLikeCategorizationRequest", () => {
  it("detects categorization phrasing", () => {
    expect(
      looksLikeCategorizationRequest(
        "Bistro belongs to food, update the transactions",
      ),
    ).toBe(true)
    expect(looksLikeCategorizationRequest("How much did I spend on food?")).toBe(
      false,
    )
  })
})
