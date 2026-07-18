import { formatDisplayDate } from "@/lib/format"
import type { BankId, Statement, Transaction } from "@/lib/types"

export type StatementIssue =
  | {
      kind: "duplicate_filename"
      otherStatementId: string
    }
  | {
      kind: "overlapping_period"
      otherStatementId: string
      overlapStart: string
      overlapEnd: string
    }
  | {
      kind: "row_count_mismatch"
      expected: number
      actual: number
    }

export type StatementLedgerRow = {
  statement: Statement
  actualCount: number
  issues: StatementIssue[]
  hasWarnings: boolean
}

export type StatementLedgerSummary = {
  sourceCount: number
  transactionCount: number
  duplicateFilenameGroups: number
  overlappingPairs: number
  rowCountMismatches: number
}

function periodsOverlap(
  a: Pick<Statement, "periodStart" | "periodEnd">,
  b: Pick<Statement, "periodStart" | "periodEnd">,
): { overlapStart: string; overlapEnd: string } | null {
  const start = a.periodStart > b.periodStart ? a.periodStart : b.periodStart
  const end = a.periodEnd < b.periodEnd ? a.periodEnd : b.periodEnd
  if (start > end) return null
  return { overlapStart: start, overlapEnd: end }
}

function normalizeFilename(filename: string): string {
  return filename.trim().toLowerCase()
}

export function countTransactionsByStatement(
  transactions: Transaction[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tx of transactions) {
    counts.set(tx.statementId, (counts.get(tx.statementId) ?? 0) + 1)
  }
  return counts
}

export function buildStatementLedger(
  statements: Statement[],
  transactions: Transaction[],
): StatementLedgerRow[] {
  const counts = countTransactionsByStatement(transactions)
  const sorted = [...statements].sort(
    (a, b) => b.uploadedAt.localeCompare(a.uploadedAt),
  )

  return sorted.map((statement) => {
    const actualCount = counts.get(statement.id) ?? 0
    const issues: StatementIssue[] = []

    if (statement.rowCount !== actualCount) {
      issues.push({
        kind: "row_count_mismatch",
        expected: statement.rowCount,
        actual: actualCount,
      })
    }

    const filenameKey = normalizeFilename(statement.filename)
    for (const other of sorted) {
      if (other.id === statement.id) continue

      if (
        normalizeFilename(other.filename) === filenameKey &&
        !issues.some(
          (issue) =>
            issue.kind === "duplicate_filename" &&
            issue.otherStatementId === other.id,
        )
      ) {
        issues.push({
          kind: "duplicate_filename",
          otherStatementId: other.id,
        })
      }

      if (statement.bank === other.bank) {
        const overlap = periodsOverlap(statement, other)
        if (
          overlap &&
          !issues.some(
            (issue) =>
              issue.kind === "overlapping_period" &&
              issue.otherStatementId === other.id,
          )
        ) {
          issues.push({
            kind: "overlapping_period",
            otherStatementId: other.id,
            overlapStart: overlap.overlapStart,
            overlapEnd: overlap.overlapEnd,
          })
        }
      }
    }

    return {
      statement,
      actualCount,
      issues,
      hasWarnings: issues.length > 0,
    }
  })
}

export function summarizeStatementLedger(
  rows: StatementLedgerRow[],
  transactionCount: number,
): StatementLedgerSummary {
  const duplicateIds = new Set<string>()
  let overlappingPairs = 0
  let rowCountMismatches = 0

  for (const row of rows) {
    for (const issue of row.issues) {
      if (issue.kind === "duplicate_filename") {
        duplicateIds.add(row.statement.id)
        duplicateIds.add(issue.otherStatementId)
      }
      if (issue.kind === "overlapping_period") overlappingPairs += 1
      if (issue.kind === "row_count_mismatch") rowCountMismatches += 1
    }
  }

  return {
    sourceCount: rows.length,
    transactionCount,
    duplicateFilenameGroups: duplicateIds.size > 0 ? duplicateIds.size : 0,
    overlappingPairs,
    rowCountMismatches,
  }
}

export function formatStatementPeriod(statement: Statement): string {
  if (statement.periodStart === statement.periodEnd) {
    return formatDisplayDate(statement.periodStart)
  }
  return `${formatDisplayDate(statement.periodStart)} – ${formatDisplayDate(statement.periodEnd)}`
}

export function formatBankLabel(bank: BankId): string {
  if (bank === "generic") return "Generic"
  return bank.toUpperCase()
}

export function issueLabel(
  issue: StatementIssue,
  statementsById: Map<string, Statement>,
): string {
  if (issue.kind === "row_count_mismatch") {
    return `Stored ${issue.expected} rows, ${issue.actual} in database`
  }

  const other = statementsById.get(issue.otherStatementId)
  const otherName = other?.filename ?? "another upload"

  if (issue.kind === "duplicate_filename") {
    return `Same filename as ${otherName}`
  }

  return `Overlaps ${otherName} (${formatDisplayDate(issue.overlapStart)} – ${formatDisplayDate(issue.overlapEnd)})`
}
