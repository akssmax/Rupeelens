import { describe, expect, it } from "vitest"
import { parseBankCsv } from "@/lib/banks"
import { DEMO_CSV, DEMO_FILENAME } from "./demo-statement"

describe("sandbox demo statement", () => {
  it("parses into Axis transactions for June 2026", () => {
    const parsed = parseBankCsv({
      text: DEMO_CSV,
      filename: DEMO_FILENAME,
      bankOverride: "axis",
    })

    expect(parsed.bank).toBe("axis")
    expect(parsed.rows.length).toBeGreaterThanOrEqual(20)
    expect(parsed.rows.every((row) => row.date.startsWith("2026-06"))).toBe(
      true,
    )
    expect(parsed.rows.some((row) => /swiggy/i.test(row.description))).toBe(
      true,
    )
    expect(parsed.rows.some((row) => row.credit > 0)).toBe(true)
  })
})
