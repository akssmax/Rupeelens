import Papa from "papaparse"
import { buildCategoryMap, resolveCategoryName } from "./categories"
import { formatDisplayDate } from "./format"
import type { Category, CategoryId, Transaction } from "./types"

export function filterTransactionsForExport(
  transactions: Transaction[],
  filters?: { merchant?: string; categoryId?: CategoryId },
): Transaction[] {
  let rows = transactions
  if (filters?.merchant) {
    const q = filters.merchant.toLowerCase()
    rows = rows.filter(
      (t) =>
        t.merchant?.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
  }
  if (filters?.categoryId) {
    rows = rows.filter((t) => t.categoryId === filters.categoryId)
  }
  return rows
}

function safeFilename(base: string, ext: string): string {
  const safe = base.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80)
  return `${safe || "transactions"}.${ext}`
}

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function rowsForExport(transactions: Transaction[], categories: Category[]) {
  const categoryMap = buildCategoryMap(categories)
  return transactions.map((t) => ({
    date: formatDisplayDate(t.date),
    merchant: t.merchant ?? "",
    description: t.description,
    category: resolveCategoryName(t.categoryId, categoryMap),
    debit: t.debit > 0 ? t.debit : "",
    credit: t.credit > 0 ? t.credit : "",
    amount: t.amount,
  }))
}

export function downloadTransactionsCsv(
  transactions: Transaction[],
  categories: Category[],
  filenameBase: string,
) {
  const rows = rowsForExport(transactions, categories)
  const csv = Papa.unparse(
    rows.map((r) => ({
      Date: r.date,
      Merchant: r.merchant,
      Description: r.description,
      Category: r.category,
      Debit: r.debit,
      Credit: r.credit,
      Amount: r.amount,
    })),
  )
  downloadBlob(csv, safeFilename(filenameBase, "csv"), "text/csv;charset=utf-8")
}

