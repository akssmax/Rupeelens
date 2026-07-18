import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { buildCategoryMap, resolveCategoryName } from "./categories"
import { formatDisplayDate, formatINR } from "./format"
import type { Category, Transaction } from "./types"

function safeFilename(base: string, ext: string): string {
  const safe = base.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80)
  return `${safe || "transactions"}.${ext}`
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
  }))
}

export function downloadTransactionsPdf(
  transactions: Transaction[],
  categories: Category[],
  filenameBase: string,
  title: string,
) {
  const rows = rowsForExport(transactions, categories)
  const doc = new jsPDF({
    orientation: rows.length > 20 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  })

  doc.setFontSize(13)
  doc.text(title, 14, 14)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`${rows.length} transactions`, 14, 20)

  autoTable(doc, {
    startY: 24,
    head: [["Date", "Merchant", "Description", "Category", "Debit", "Credit"]],
    body: rows.map((r) => [
      r.date,
      r.merchant,
      r.description,
      r.category,
      r.debit !== "" ? formatINR(Number(r.debit)) : "",
      r.credit !== "" ? formatINR(Number(r.credit)) : "",
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [38, 111, 91] },
    margin: { left: 14, right: 14 },
  })

  doc.save(safeFilename(filenameBase, "pdf"))
}
