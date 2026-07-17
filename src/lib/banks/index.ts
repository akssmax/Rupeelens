import Papa from "papaparse"
import type { BankId, ColumnMapping, ParseResult } from "../types"
import { parseAxis } from "./axis"
import { detectBank } from "./detectBank"
import { parseGeneric } from "./generic"
import { findHeaderRow, stripNoiseRows } from "./normalize"
import {
  parseHdfc,
  parseIcici,
  parseIdfc,
  parseIndusind,
  parseKotak,
  parseSbi,
  parseYes,
} from "./standard"

export { detectBank } from "./detectBank"
export { inferColumnMapping, listCsvHeaders } from "./generic"

function toMatrix(text: string): string[][] {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  })
  return (parsed.data as string[][]).map((row) =>
    row.map((c) => (c == null ? "" : String(c))),
  )
}

function headersFromMatrix(matrix: string[][]): string[] {
  const cleaned = stripNoiseRows(matrix)
  const idx = findHeaderRow(cleaned, ["date", "debit", "credit", "particulars"])
  if (idx >= 0) return cleaned[idx]!.map((h) => h.trim())
  return cleaned[0]?.map((h) => h.trim()) ?? []
}

export function parseBankCsv(params: {
  text: string
  filename: string
  bankOverride?: BankId
  mapping?: ColumnMapping
}): ParseResult {
  const matrix = toMatrix(params.text)
  const headers = headersFromMatrix(matrix)
  const bank =
    params.bankOverride ??
    detectBank({
      headers,
      sampleText: params.text.slice(0, 2000),
      filename: params.filename,
    })

  if (params.mapping) {
    return { ...parseGeneric(matrix, params.mapping), bank }
  }

  let result: ParseResult
  switch (bank) {
    case "axis":
      result = parseAxis(matrix)
      break
    case "hdfc":
      result = parseHdfc(matrix)
      break
    case "icici":
      result = parseIcici(matrix)
      break
    case "sbi":
      result = parseSbi(matrix)
      break
    case "kotak":
      result = parseKotak(matrix)
      break
    case "yes":
      result = parseYes(matrix)
      break
    case "indusind":
      result = parseIndusind(matrix)
      break
    case "idfc":
      result = parseIdfc(matrix)
      break
    default:
      result = parseGeneric(matrix)
  }

  // Fallback to generic if bank-specific parser failed
  if (result.rows.length === 0 && bank !== "generic") {
    const fallback = parseGeneric(matrix)
    if (fallback.rows.length > 0) {
      return {
        bank,
        rows: fallback.rows,
        warnings: [
          ...result.warnings,
          "Used generic column inference after bank parser returned no rows",
        ],
      }
    }
  }

  return result
}

export function detectBankFromFile(text: string, filename: string): BankId {
  const matrix = toMatrix(text)
  const headers = headersFromMatrix(matrix)
  return detectBank({
    headers,
    sampleText: text.slice(0, 2000),
    filename,
  })
}
