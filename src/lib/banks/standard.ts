import { parseINRAmount } from "../format"
import type { BankId, ParseResult } from "../types"
import {
  buildParsedRow,
  findHeaderRow,
  pickField,
  rowToObject,
  stripNoiseRows,
} from "./normalize"

/** Shared parser for debit/credit column style Indian bank CSVs */
export function parseStandardBank(
  bank: BankId,
  matrix: string[][],
  fieldHints?: {
    date?: string[]
    description?: string[]
    debit?: string[]
    credit?: string[]
    balance?: string[]
    valueDate?: string[]
    bankRef?: string[]
  },
): ParseResult {
  const cleaned = stripNoiseRows(matrix)
  const headerIdx = findHeaderRow(cleaned, ["date", "debit", "credit"])
  if (headerIdx < 0) {
    return {
      bank,
      rows: [],
      warnings: [`Could not find header row for ${bank}`],
    }
  }

  const headers = cleaned[headerIdx]!.map((h) => h.trim())
  const rows = []
  const warnings: string[] = []

  for (const values of cleaned.slice(headerIdx + 1)) {
    if (values.every((v) => !v?.trim())) continue
    const raw = rowToObject(headers, values)

    const date = pickField(
      raw,
      fieldHints?.date ?? [
        "Date",
        "Txn Date",
        "Transaction Date",
        "Value Date",
        "Tran Date",
      ],
    )
    const description = pickField(
      raw,
      fieldHints?.description ?? [
        "Narration",
        "Description",
        "Particulars",
        "Remarks",
        "Transaction Remarks",
        "Details",
      ],
    )
    const debit = Math.abs(
      parseINRAmount(
        pickField(
          raw,
          fieldHints?.debit ?? [
            "Debit",
            "Debit Amount",
            "Withdrawal Amt.",
            "Withdrawal Amt",
            "Withdrawal Amount",
            "Withdrawals",
          ],
        ),
      ),
    )
    const credit = Math.abs(
      parseINRAmount(
        pickField(
          raw,
          fieldHints?.credit ?? [
            "Credit",
            "Credit Amount",
            "Deposit Amt.",
            "Deposit Amt",
            "Deposit Amount",
            "Deposits",
          ],
        ),
      ),
    )
    const balanceRaw = pickField(
      raw,
      fieldHints?.balance ?? ["Balance", "Closing Balance", "Running Balance"],
    )
    const valueDate =
      pickField(raw, fieldHints?.valueDate ?? ["Value Date", "Value Dt"]) ||
      undefined
    const bankRef =
      pickField(
        raw,
        fieldHints?.bankRef ?? [
          "Chq/Ref No",
          "Chq Ref Number",
          "Ref No",
          "Cheque Number",
          "Txn Id",
        ],
      ) || undefined

    if (/opening balance|closing balance|^total/i.test(description)) continue

    const parsed = buildParsedRow({
      date,
      valueDate,
      description,
      debit,
      credit,
      balance: balanceRaw ? parseINRAmount(balanceRaw) : undefined,
      bankRef,
      raw,
    })
    if (parsed) rows.push(parsed)
  }

  if (rows.length === 0) {
    warnings.push(`${bank} parser found no rows`)
  }

  return { bank, rows, warnings }
}

export function parseHdfc(matrix: string[][]): ParseResult {
  return parseStandardBank("hdfc", matrix, {
    date: ["Date", "Txn Date"],
    description: ["Narration"],
    debit: ["Withdrawal Amt.", "Withdrawal Amt"],
    credit: ["Deposit Amt.", "Deposit Amt"],
    valueDate: ["Value Dt", "Value Date"],
    bankRef: ["Chq/Ref No", "Chq Ref Number"],
  })
}

export function parseIcici(matrix: string[][]): ParseResult {
  return parseStandardBank("icici", matrix, {
    description: ["Transaction Remarks", "Remarks", "Narration"],
    debit: ["Withdrawal Amount", "Debit"],
    credit: ["Deposit Amount", "Credit"],
  })
}

export function parseSbi(matrix: string[][]): ParseResult {
  return parseStandardBank("sbi", matrix)
}

export function parseKotak(matrix: string[][]): ParseResult {
  return parseStandardBank("kotak", matrix)
}

export function parseYes(matrix: string[][]): ParseResult {
  return parseStandardBank("yes", matrix)
}

export function parseIndusind(matrix: string[][]): ParseResult {
  return parseStandardBank("indusind", matrix)
}

export function parseIdfc(matrix: string[][]): ParseResult {
  return parseStandardBank("idfc", matrix)
}
