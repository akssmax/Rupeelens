import type { ColumnMapping, ParseResult } from "../types"
import { normalizeHeader, parseWithMapping, stripNoiseRows } from "./normalize"
import { findHeaderRow, rowToObject } from "./normalize"

const DATE_HINTS = ["date", "txn date", "tran date", "transaction date", "value date"]
const DESC_HINTS = [
  "narration",
  "particulars",
  "description",
  "remarks",
  "details",
  "transaction remarks",
]
const DEBIT_HINTS = [
  "debit",
  "withdrawal",
  "withdrawals",
  "withdrawal amt",
  "withdrawal amount",
  "dr",
]
const CREDIT_HINTS = [
  "credit",
  "deposit",
  "deposits",
  "deposit amt",
  "deposit amount",
  "cr",
]
const AMOUNT_HINTS = ["amount", "txn amount", "transaction amount"]
const BALANCE_HINTS = ["balance", "running balance", "closing balance"]

function matchColumn(headers: string[], hints: string[]): string | undefined {
  for (const h of headers) {
    const n = normalizeHeader(h)
    if (hints.some((hint) => n === hint || n.includes(hint))) return h
  }
  return undefined
}

export function inferColumnMapping(headers: string[]): ColumnMapping | null {
  const date = matchColumn(headers, DATE_HINTS)
  const description = matchColumn(headers, DESC_HINTS)
  if (!date || !description) return null

  const debit = matchColumn(headers, DEBIT_HINTS)
  const credit = matchColumn(headers, CREDIT_HINTS)
  const amount = matchColumn(headers, AMOUNT_HINTS)
  const balance = matchColumn(headers, BALANCE_HINTS)
  const valueDate = matchColumn(headers, ["value date", "value dt"])
  const bankRef = matchColumn(headers, [
    "chq",
    "ref",
    "cheque",
    "txn id",
    "reference",
  ])

  if (!debit && !credit && !amount) return null

  return {
    date,
    description,
    debit,
    credit,
    amount,
    balance,
    valueDate,
    bankRef,
  }
}

export function parseGeneric(
  matrix: string[][],
  mappingOverride?: ColumnMapping,
): ParseResult {
  const cleaned = stripNoiseRows(matrix)
  const headerIdx = findHeaderRow(cleaned, ["date"])
  if (headerIdx < 0) {
    return {
      bank: "generic",
      rows: [],
      warnings: ["Could not detect CSV header row"],
    }
  }

  const headers = cleaned[headerIdx]!.map((h) => h.trim())
  const mapping = mappingOverride ?? inferColumnMapping(headers)
  if (!mapping) {
    return {
      bank: "generic",
      rows: [],
      warnings: [
        "Could not infer columns. Map Date, Description, and Debit/Credit manually.",
      ],
    }
  }

  const dataRows = cleaned
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c?.trim()))
    .map((values) => rowToObject(headers, values))

  const rows = parseWithMapping(dataRows, mapping)
  return {
    bank: "generic",
    rows,
    warnings:
      rows.length === 0
        ? ["Generic parser produced no rows with inferred mapping"]
        : [],
  }
}

export function listCsvHeaders(matrix: string[][]): string[] {
  const cleaned = stripNoiseRows(matrix)
  const headerIdx = findHeaderRow(cleaned, ["date"])
  if (headerIdx < 0) {
    return cleaned[0]?.map((h) => h.trim()).filter(Boolean) ?? []
  }
  return cleaned[headerIdx]!.map((h) => h.trim()).filter(Boolean)
}
