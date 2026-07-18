import { describe, expect, it } from "vitest"
import {
  looksLikeCategorizationRequest,
  matchMerchantTransactions,
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
      categoryId: "other",
    }),
  ]

  it("matches all Bistro transactions including already categorized", () => {
    const matched = matchMerchantTransactions(transactions, "Bistro")
    expect(matched.map((tx) => tx.id)).toEqual(["1", "2", "3"])
  })

  it("matches uncategorized Bistro transactions only via legacy helper", () => {
    const matched = matchUncategorizedTransactions(transactions, "Bistro")
    expect(matched.map((tx) => tx.id)).toEqual(["1", "2"])
  })

  it("matches multi-word merchant queries across categories", () => {
    const matched = matchMerchantTransactions(transactions, "Gk Wines")
    expect(matched.map((tx) => tx.id)).toEqual(["4"])
  })

  it("returns zero matches for unknown merchants", () => {
    const matched = matchMerchantTransactions(transactions, "Zomato")
    expect(matched).toHaveLength(0)
  })

  it("splits previews into toUpdate and alreadyCorrect", () => {
    const previews = previewCategorizationActions(transactions, [
      {
        merchantQuery: "Bistro",
        categoryId: "food",
        categoryName: "Food",
      },
      {
        merchantQuery: "Gk Wines",
        categoryId: "food",
        categoryName: "Food",
      },
      {
        merchantQuery: "Zomato",
        categoryId: "food",
        categoryName: "Food",
      },
    ])

    expect(previews[0]?.matched).toHaveLength(3)
    expect(previews[0]?.toUpdate.map((tx) => tx.id)).toEqual(["1", "2"])
    expect(previews[0]?.alreadyCorrect.map((tx) => tx.id)).toEqual(["3"])
    expect(previews[0]?.currentCategoryName).toBe("Uncategorized")

    expect(previews[1]?.toUpdate.map((tx) => tx.id)).toEqual(["4"])
    expect(previews[1]?.currentCategoryName).toBe("Other")

    expect(previews[2]?.matched).toHaveLength(0)
    expect(previews[2]?.skippedReason).toContain("Zomato")
  })

  it("marks all-already-correct previews with skipped reason", () => {
    const onlyFood = transactions.map((tx) =>
      tx.merchant === "Bistro" ? { ...tx, categoryId: "food" as const } : tx,
    )
    const result = previewCategorizationActions(onlyFood, [
      {
        merchantQuery: "Bistro",
        categoryId: "food",
        categoryName: "Food",
      },
    ])

    expect(result[0]?.toUpdate).toHaveLength(0)
    expect(result[0]?.alreadyCorrect).toHaveLength(3)
    expect(result[0]?.skippedReason).toContain("already in Food")
  })
})

describe("looksLikeCategorizationRequest", () => {
  it("detects categorization phrasing", () => {
    expect(
      looksLikeCategorizationRequest(
        "Bistro belongs to food, update the transactions",
      ),
    ).toBe(true)
    expect(
      looksLikeCategorizationRequest("Move Bistro to food category"),
    ).toBe(true)
    expect(looksLikeCategorizationRequest("How much did I spend on food?")).toBe(
      false,
    )
  })
})
