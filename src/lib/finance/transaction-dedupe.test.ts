import { describe, expect, it } from "vitest"
import {
  extractUpiReference,
  normalizeTransactionDescription,
  partitionNewTransactions,
  transactionDedupeKey,
} from "./transaction-dedupe"
import type { Transaction } from "@/lib/types"

function tx(
  overrides: Partial<Transaction> & Pick<Transaction, "date" | "description" | "amount">,
): Transaction {
  return {
    id: "tx_test",
    statementId: "stmt_test",
    debit: overrides.amount < 0 ? Math.abs(overrides.amount) : 0,
    credit: overrides.amount >= 0 ? overrides.amount : 0,
    categoryId: "uncategorized",
    ...overrides,
  }
}

describe("transactionDedupeKey", () => {
  it("treats whitespace-normalized descriptions as the same", () => {
    const a = tx({ date: "2026-01-01", description: "UPI/SWIGGY", amount: -420 })
    const b = tx({ date: "2026-01-01", description: "  UPI/SWIGGY  ", amount: -420 })
    expect(transactionDedupeKey(a)).toBe(transactionDedupeKey(b))
  })

  it("treats UPI rows with different padding as the same", () => {
    const a = tx({
      date: "2026-07-14",
      description:
        "UPI/P2M/938030420294/GK WINES             /Paymen/YES BANK LIMITED YBS",
      amount: -1965,
    })
    const b = tx({
      date: "2026-07-14",
      description: "UPI/P2M/938030420294/GK WINES /Paymen/YES BANK LIMITED YBS",
      amount: -1965,
    })
    expect(transactionDedupeKey(a)).toBe(transactionDedupeKey(b))
  })

  it("uses bankRef when present", () => {
    const a = tx({
      date: "2026-01-01",
      description: "NEFT transfer",
      bankRef: "938030420294",
      amount: -1000,
    })
    const b = tx({
      date: "2026-01-01",
      description: "Different narration",
      bankRef: "938030420294",
      amount: -1000,
    })
    expect(transactionDedupeKey(a)).toBe(transactionDedupeKey(b))
  })

  it("keeps different amounts separate", () => {
    const a = tx({ date: "2026-01-01", description: "UPI/SWIGGY", amount: -420 })
    const b = tx({ date: "2026-01-01", description: "UPI/SWIGGY", amount: -421 })
    expect(transactionDedupeKey(a)).not.toBe(transactionDedupeKey(b))
  })
})

describe("extractUpiReference", () => {
  it("extracts the stable UPI id from narrations", () => {
    expect(
      extractUpiReference(
        "UPI/P2M/938030420294/GK WINES /Paymen/YES BANK LIMITED YBS",
      ),
    ).toBe("938030420294")
  })
})

describe("partitionNewTransactions", () => {
  it("skips rows already stored and duplicates within the same upload", () => {
    const existing = [
      tx({ date: "2026-01-01", description: "NETFLIX", amount: -649 }),
    ]
    const candidates = [
      tx({ date: "2026-01-01", description: "NETFLIX", amount: -649 }),
      tx({ date: "2026-02-01", description: "NETFLIX", amount: -649 }),
      tx({ date: "2026-02-01", description: "NETFLIX", amount: -649 }),
    ]

    const { unique, skippedDuplicates } = partitionNewTransactions(
      candidates,
      existing,
    )

    expect(unique).toHaveLength(1)
    expect(unique[0]?.date).toBe("2026-02-01")
    expect(skippedDuplicates).toBe(2)
  })

  it("normalizes descriptions when comparing", () => {
    expect(normalizeTransactionDescription("  A   B  ")).toBe("A B")
  })
})
