import * as XLSX from "xlsx"

export function spreadsheetToCsvText(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  })

  const sheetName =
    workbook.SheetNames.find((name) => {
      const sheet = workbook.Sheets[name]
      if (!sheet) return false
      const ref = sheet["!ref"]
      return Boolean(ref && ref !== "A1")
    }) ?? workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error("No sheets found in the spreadsheet.")
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error("Could not read the spreadsheet sheet.")
  }

  const csv = XLSX.utils.sheet_to_csv(sheet, {
    FS: ",",
    RS: "\n",
    blankrows: false,
  }).trim()

  if (!csv) {
    throw new Error("The spreadsheet appears to be empty.")
  }

  return csv
}
