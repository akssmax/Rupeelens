export const STATEMENT_FILE_ACCEPT =
  ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export type StatementFileKind = "csv" | "xls" | "pdf"

export function detectStatementFileKind(file: File): StatementFileKind | null {
  const name = file.name.toLowerCase()
  if (
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv"
  ) {
    return "csv"
  }
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel")
  ) {
    return "xls"
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return "pdf"
  }
  return null
}

export function isSupportedStatementFile(file: File): boolean {
  return detectStatementFileKind(file) != null
}

export async function readStatementAsCsvText(
  file: File,
): Promise<{ text: string; kind: StatementFileKind }> {
  const kind = detectStatementFileKind(file)
  if (!kind) {
    throw new Error("Unsupported file type. Use CSV, XLS, XLSX, or PDF.")
  }

  if (kind === "csv") {
    return { text: await file.text(), kind }
  }

  if (kind === "xls") {
    const { spreadsheetToCsvText } = await import("./statement-files/spreadsheet")
    const buffer = await file.arrayBuffer()
    return { text: spreadsheetToCsvText(buffer), kind }
  }

  const { pdfToCsvText } = await import("./statement-files/pdf")
  const buffer = await file.arrayBuffer()
  return { text: await pdfToCsvText(buffer), kind }
}

export function statementKindLabel(kind: StatementFileKind): string {
  switch (kind) {
    case "csv":
      return "CSV"
    case "xls":
      return "Excel"
    case "pdf":
      return "PDF"
  }
}
