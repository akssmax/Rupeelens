import * as XLSX from "xlsx"
import { describe, expect, it } from "vitest"
import { spreadsheetToCsvText } from "./spreadsheet"

describe("spreadsheetToCsvText", () => {
  it("converts the first worksheet to CSV text", () => {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Tran Date", "Particulars", "DR", "CR", "BAL"],
      ["01/04/2026", "UPI/SWIGGY", "450.00", "", "10000.00"],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, "Statement")
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })

    const csv = spreadsheetToCsvText(buffer)
    expect(csv).toContain("Tran Date,Particulars,DR,CR,BAL")
    expect(csv).toContain("UPI/SWIGGY")
  })
})
