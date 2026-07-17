import { parseBankDate, parseINRAmount } from "../format"
import type { ColumnMapping, ParsedRow } from "../types"

export function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function findHeaderRow(
  rows: string[][],
  requiredHints: string[],
): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i]!.map(normalizeHeader)
    const joined = cells.join(" | ")
    const hits = requiredHints.filter((h) =>
      cells.some((c) => c.includes(h) || joined.includes(h)),
    )
    if (hits.length >= Math.min(2, requiredHints.length)) return i
  }
  return -1
}

export function rowToObject(
  headers: string[],
  values: string[],
): Record<string, string> {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => {
    obj[h] = (values[i] ?? "").trim()
  })
  return obj
}

/** Short tokens that must never match via substring (MICR⊃CR, Address⊃DR). */
const SHORT_EXACT_ONLY = new Set(["dr", "cr", "bal"])

export function pickField(
  row: Record<string, string>,
  candidates: string[],
): string {
  const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v] as const)

  // Pass 1: exact normalized header match
  for (const cand of candidates) {
    const n = normalizeHeader(cand)
    for (const [k, v] of entries) {
      if (k === n) return v
    }
  }

  // Pass 2: longer aliases may use includes; short tokens stay exact-only
  for (const cand of candidates) {
    const n = normalizeHeader(cand)
    if (SHORT_EXACT_ONLY.has(n) || n.length <= 3) continue
    for (const [k, v] of entries) {
      if (k.includes(n)) return v
    }
  }

  return ""
}

export function buildParsedRow(params: {
  date: string
  valueDate?: string
  description: string
  debit: number
  credit: number
  balance?: number
  bankRef?: string
  raw: Record<string, string>
}): ParsedRow | null {
  const date = parseBankDate(params.date)
  if (!date) return null
  const description = params.description.trim()
  if (!description) return null

  let debit = Math.abs(params.debit) || 0
  let credit = Math.abs(params.credit) || 0

  // If only one side filled incorrectly as negative
  if (debit === 0 && credit === 0) return null

  return {
    date,
    valueDate: params.valueDate
      ? (parseBankDate(params.valueDate) ?? undefined)
      : undefined,
    description,
    debit,
    credit,
    balance:
      params.balance != null && params.balance !== 0
        ? params.balance
        : params.balance === 0
          ? 0
          : undefined,
    bankRef: params.bankRef || undefined,
    raw: params.raw,
  }
}

export function parseWithMapping(
  dataRows: Record<string, string>[],
  mapping: ColumnMapping,
): ParsedRow[] {
  const rows: ParsedRow[] = []

  for (const raw of dataRows) {
    const date = raw[mapping.date] ?? ""
    const description = raw[mapping.description] ?? ""
    let debit = mapping.debit ? Math.abs(parseINRAmount(raw[mapping.debit])) : 0
    let credit = mapping.credit
      ? Math.abs(parseINRAmount(raw[mapping.credit]))
      : 0

    if (mapping.amount && debit === 0 && credit === 0) {
      const amt = parseINRAmount(raw[mapping.amount])
      if (amt < 0) debit = Math.abs(amt)
      else if (amt > 0) credit = amt
    }

    const parsed = buildParsedRow({
      date,
      valueDate: mapping.valueDate ? raw[mapping.valueDate] : undefined,
      description,
      debit,
      credit,
      balance: mapping.balance
        ? parseINRAmount(raw[mapping.balance])
        : undefined,
      bankRef: mapping.bankRef ? raw[mapping.bankRef] : undefined,
      raw,
    })
    if (parsed) rows.push(parsed)
  }

  return rows
}

export function stripNoiseRows(matrix: string[][]): string[][] {
  return matrix.filter((row) => {
    const joined = row.join(" ").trim()
    if (!joined) return false
    // Keep the transaction header row even if it contains "statement"-like noise elsewhere
    const cells = row.map(normalizeHeader)
    if (
      cells.includes("tran date") ||
      cells.includes("particulars") ||
      (cells.includes("date") &&
        (cells.includes("debit") || cells.includes("dr")))
    ) {
      return true
    }
    if (
      /^(name|joint holder|currency|customer id|ifsc|micr|nominee|registered|pan|ckyc|statement of account|unless constituent|transaction total|opening balance|closing balance)/i.test(
        joined,
      )
    ) {
      return false
    }
    if (/^statement|^account|^customer|^branch|^ifsc|^page\s/i.test(joined)) {
      return false
    }
    return true
  })
}
