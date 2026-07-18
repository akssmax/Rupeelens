import * as pdfjs from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { matrixToCsvText } from "./matrix-to-csv"

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

type PdfTextItem = {
  str: string
  x: number
  y: number
}

const DATE_RE =
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}-\w{3}-\d{2,4}|\d{4}-\d{2}-\d{2})\b/

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function clusterRowCells(items: PdfTextItem[]): string[] {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const cells: string[] = []
  let current = sorted[0]!.str
  let lastX = sorted[0]!.x

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]!
    if (item.x - lastX > 18) {
      cells.push(current.trim())
      current = item.str
    } else {
      current = `${current} ${item.str}`.replace(/\s+/g, " ")
    }
    lastX = item.x
  }
  cells.push(current.trim())
  return cells.filter(Boolean)
}

async function extractPdfMatrix(buffer: ArrayBuffer): Promise<string[][]> {
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const items: PdfTextItem[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue
      const transform = item.transform
      items.push({
        str: item.str.trim(),
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
      })
    }
  }

  if (items.length === 0) {
    throw new Error("Could not read text from the PDF.")
  }

  const tolerance = 3
  const rowsByY = new Map<number, PdfTextItem[]>()
  for (const item of items) {
    const yKey = Math.round(item.y / tolerance) * tolerance
    const row = rowsByY.get(yKey) ?? []
    row.push(item)
    rowsByY.set(yKey, row)
  }

  return [...rowsByY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, rowItems]) => clusterRowCells(rowItems))
    .filter((row) => row.some((cell) => cell.trim()))
}

function findHeaderRowIndex(matrix: string[][]): number {
  const hints = [
    "date",
    "txn",
    "tran",
    "particular",
    "narration",
    "description",
    "debit",
    "credit",
    "withdrawal",
    "deposit",
    "balance",
    "dr",
    "cr",
  ]

  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const joined = matrix[i]!.join(" ").toLowerCase()
    let score = 0
    for (const hint of hints) {
      if (joined.includes(hint)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore >= 2 ? bestIdx : -1
}

function parseLooseTransactionLines(lines: string[]): string[][] {
  const rows: string[][] = []
  for (const line of lines) {
    const dateMatch = line.match(DATE_RE)
    if (!dateMatch) continue

    const date = dateMatch[1]!
    const rest = line.slice(dateMatch.index! + date.length).trim()
    const amounts = [...rest.matchAll(/\d[\d,]*\.\d{2}/g)].map((m) => m[0]!)
    if (amounts.length === 0) continue

    const amountStart = rest.indexOf(amounts[0]!)
    const description =
      amountStart > 0 ? rest.slice(0, amountStart).trim() : rest.trim()

    let debit = ""
    let credit = ""
    if (amounts.length >= 2) {
      debit = amounts[0]!
      credit = amounts[1]!
    } else {
      const lower = `${description} ${rest}`.toLowerCase()
      if (/upi|paid to|withdraw|purchase|debit|ach|dr\b/i.test(lower)) {
        debit = amounts[0]!
      } else {
        credit = amounts[0]!
      }
    }

    rows.push([date, description, debit, credit])
  }
  return rows
}

export async function pdfToCsvText(buffer: ArrayBuffer): Promise<string> {
  const matrix = await extractPdfMatrix(buffer)
  if (matrix.length === 0) {
    throw new Error("Could not extract rows from the PDF.")
  }

  const headerIdx = findHeaderRowIndex(matrix)
  if (headerIdx >= 0) {
    const table = matrix.slice(headerIdx)
    if (table.length > 1) {
      return matrixToCsvText(table)
    }
  }

  const looseLines = matrix.map((row) => row.join(" "))
  const parsed = parseLooseTransactionLines(looseLines)
  if (parsed.length === 0) {
    throw new Error(
      "Could not parse transactions from the PDF. Try exporting CSV or Excel from your bank.",
    )
  }

  return [
    ["Date", "Description", "Debit", "Credit"].map(escapeCsvCell).join(","),
    ...parsed.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n")
}
