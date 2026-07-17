import { parseINRAmount } from "../format"
import type { ParsedRow, ParseResult } from "../types"
import {
  buildParsedRow,
  findHeaderRow,
  normalizeHeader,
  pickField,
  rowToObject,
  stripNoiseRows,
} from "./normalize"

/**
 * Axis retail CSV often uses Tran Date, CHQNO, PARTICULARS, DR, CR, BAL, SOL
 * with metadata lines above the header. Some exports put money-out under CR
 * (verified via running balance). We correct using balance deltas when possible.
 */
export function parseAxis(matrix: string[][]): ParseResult {
  const cleaned = stripNoiseRows(matrix)
  const headerIdx = findHeaderRow(cleaned, [
    "tran date",
    "particulars",
    "dr",
    "cr",
    "bal",
    "debit",
    "credit",
  ])

  if (headerIdx < 0) {
    return {
      bank: "axis",
      rows: [],
      warnings: ["Could not find Axis header row"],
    }
  }

  const headers = cleaned[headerIdx]!.map((h) => h.trim())
  const warnings: string[] = []
  const provisional: Array<{
    row: ParsedRow
    rawDebit: number
    rawCredit: number
  }> = []

  for (const values of cleaned.slice(headerIdx + 1)) {
    if (values.every((v) => !v?.trim())) continue
    // Skip trailing summary lines
    const joined = values.join(" ").toLowerCase()
    if (
      joined.includes("transaction total") ||
      joined.includes("closing balance") ||
      joined.includes("opening balance") ||
      joined.includes("unless constituent")
    ) {
      continue
    }

    const raw = rowToObject(headers, values)
    const date = pickField(raw, [
      "Tran Date",
      "Transaction Date",
      "Txn Date",
      "Date",
      "Trans Date",
    ])
    const description = pickField(raw, [
      "Particulars",
      "PARTICULARS",
      "Narration",
      "Description",
      "Remarks",
    ])
    if (!description.trim()) continue
    if (/opening balance|closing balance|^totals?$/i.test(description)) continue

    const rawDebit = Math.abs(
      parseINRAmount(
        pickField(raw, [
          "DR",
          "Dr",
          "Debit",
          "Debit Amount",
          "Withdrawal",
          "Withdrawal Amt",
        ]),
      ),
    )
    const rawCredit = Math.abs(
      parseINRAmount(
        pickField(raw, [
          "CR",
          "Cr",
          "Credit",
          "Credit Amount",
          "Deposit",
          "Deposit Amt",
        ]),
      ),
    )

    const balanceRaw = pickField(raw, [
      "BAL",
      "Bal",
      "Balance",
      "Running Balance",
      "Closing Balance",
    ])
    const balance = balanceRaw ? parseINRAmount(balanceRaw) : undefined
    const bankRef =
      pickField(raw, ["CHQNO", "Chq No", "Cheque No", "Chq/Ref No", "Ref No"]) ||
      undefined
    const valueDate =
      pickField(raw, ["Value Date", "Value Dt"]) || undefined

    const parsed = buildParsedRow({
      date,
      valueDate,
      description,
      debit: rawDebit,
      credit: rawCredit,
      balance,
      bankRef: bankRef === "-" ? undefined : bankRef,
      raw,
    })
    if (parsed) {
      provisional.push({ row: parsed, rawDebit, rawCredit })
    }
  }

  const rows = applyBalanceAwareSign(provisional)
  if (rows.length === 0) {
    warnings.push("Axis parser found headers but no transaction rows")
  } else {
    // Detect if we swapped relative to header names
    const swapped = rows.some(
      (r, i) =>
        provisional[i] &&
        ((r.debit > 0 && provisional[i]!.rawCredit > 0 && provisional[i]!.rawDebit === 0) ||
          (r.credit > 0 && provisional[i]!.rawDebit > 0 && provisional[i]!.rawCredit === 0)),
    )
    if (swapped) {
      warnings.push(
        "Adjusted DR/CR using balance movement (Axis retail export quirk)",
      )
    }
  }

  return { bank: "axis", rows, warnings }
}

function applyBalanceAwareSign(
  items: Array<{ row: ParsedRow; rawDebit: number; rawCredit: number }>,
): ParsedRow[] {
  if (items.length < 2) {
    return items.map((i) => i.row)
  }

  // Score on date-ascending order so newest-first exports still work
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byDate = a.item.row.date.localeCompare(b.item.row.date)
      return byDate !== 0 ? byDate : a.index - b.index
    })
    .map(({ item }) => item)

  let standardMatches = 0
  let swappedMatches = 0
  let compared = 0

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!.row.balance
    const curr = ordered[i]!.row.balance
    const { rawDebit, rawCredit } = ordered[i]!
    if (prev == null || curr == null) continue
    if (rawDebit === 0 && rawCredit === 0) continue

    const delta = curr - prev
    compared++

    // Standard: debit decreases balance, credit increases
    const expectedStandard =
      rawCredit > 0 && rawDebit === 0
        ? rawCredit
        : rawDebit > 0 && rawCredit === 0
          ? -rawDebit
          : rawCredit - rawDebit
    // Swapped labels: CR is money-out, DR is money-in
    const expectedSwapped =
      rawCredit > 0 && rawDebit === 0
        ? -rawCredit
        : rawDebit > 0 && rawCredit === 0
          ? rawDebit
          : rawDebit - rawCredit

    if (Math.abs(delta - expectedStandard) < 0.05) standardMatches++
    if (Math.abs(delta - expectedSwapped) < 0.05) swappedMatches++
  }

  const useSwapped = compared > 0 && swappedMatches > standardMatches

  return items.map(({ row, rawDebit, rawCredit }) => {
    if (!useSwapped) return row
    return {
      ...row,
      debit: rawCredit,
      credit: rawDebit,
    }
  })
}

/** Quick check used by detector */
export function looksLikeAxisHeaders(headers: string[]): boolean {
  const h = headers.map(normalizeHeader).join(" | ")
  return (
    (h.includes("particulars") && (h.includes(" dr") || h.includes("|dr|") || h.startsWith("dr") || h.includes(" dr ") || /\bdr\b/.test(h))) ||
    (h.includes("tran date") && h.includes("particulars"))
  )
}
