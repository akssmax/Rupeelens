import { describe, expect, it } from "vitest"
import {
  buildStatementLedger,
  summarizeStatementLedger,
} from "./ledger"
import type { Statement, Transaction } from "@/lib/types"

function stmt(overrides: Partial<Statement> & Pick<Statement, "id">): Statement {
  return {
    bank: "axis",
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    uploadedAt: "2026-07-17T20:55:48.674Z",
    filename: "statement.csv",
    rowCount: 100,
    ...overrides,
  }
}

function tx(statementId: string, id: string): Transaction {
  return {
    id,
    statementId,
    date: "2026-01-15",
    description: "Test",
    debit: 100,
    credit: 0,
    amount: -100,
    categoryId: "other",
  }
}

describe("buildStatementLedger", () => {
  it("flags duplicate filenames and row count mismatches", () => {
    const statements = [
      stmt({
        id: "s1",
        filename: "AcctStatement.csv",
        rowCount: 100,
        uploadedAt: "2026-07-17T20:55:48.674Z",
      }),
      stmt({
        id: "s2",
        filename: "AcctStatement.csv",
        rowCount: 696,
        uploadedAt: "2026-07-18T07:59:36.041Z",
      }),
    ]
    const transactions = [
      tx("s1", "t1"),
      tx("s1", "t2"),
      tx("s2", "t3"),
    ]

    const rows = buildStatementLedger(statements, transactions)

    expect(rows[0]?.statement.id).toBe("s2")
    expect(rows[0]?.actualCount).toBe(1)
    expect(rows[0]?.issues.some((i) => i.kind === "duplicate_filename")).toBe(
      true,
    )
    expect(rows[0]?.issues.some((i) => i.kind === "row_count_mismatch")).toBe(
      true,
    )
  })

  it("summarizes ledger health", () => {
    const rows = buildStatementLedger(
      [
        stmt({ id: "s1", rowCount: 1 }),
        stmt({ id: "s2", filename: "other.csv", rowCount: 1 }),
      ],
      [tx("s1", "t1"), tx("s2", "t2")],
    )

    const summary = summarizeStatementLedger(rows, 2)
    expect(summary.sourceCount).toBe(2)
    expect(summary.transactionCount).toBe(2)
  })
})
