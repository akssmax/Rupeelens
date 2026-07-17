import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseBankCsv } from "./index"

describe("Axis CSV parser", () => {
  it("parses the sample Axis statement", () => {
    const text = readFileSync(
      resolve(process.cwd(), "fixtures/axis-sample.csv"),
      "utf8",
    )
    const result = parseBankCsv({
      text,
      filename: "axis-sample.csv",
      bankOverride: "axis",
    })

    expect(result.bank).toBe("axis")
    expect(result.rows.length).toBeGreaterThanOrEqual(10)
    expect(result.rows.some((r) => r.credit > 0)).toBe(true)
    expect(result.rows.some((r) => r.debit > 0)).toBe(true)
    expect(result.rows[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Ensure decimals are preserved (regression: dots must not be stripped)
    expect(result.rows.every((r) => r.debit < 1_000_000)).toBe(true)
  })

  it("detects swapped DR/CR on newest-first exports via balance", () => {
    const text = readFileSync(
      resolve(process.cwd(), "fixtures/axis-newest-swapped.csv"),
      "utf8",
    )
    const result = parseBankCsv({
      text,
      filename: "axis-newest-swapped.csv",
      bankOverride: "axis",
    })

    expect(result.bank).toBe("axis")
    const swiggy = result.rows.find((r) => /swiggy/i.test(r.description))
    const blinkit = result.rows.find((r) => /blinkit/i.test(r.description))
    const salary = result.rows.find((r) => /salary/i.test(r.description))

    // Money-out was labeled CR in the file — must land as debit after correction
    expect(swiggy?.debit).toBe(300)
    expect(swiggy?.credit).toBe(0)
    expect(blinkit?.debit).toBe(200)
    expect(blinkit?.credit).toBe(0)
    // Money-in was labeled DR — must land as credit
    expect(salary?.credit).toBe(500)
    expect(salary?.debit).toBe(0)
    expect(result.warnings.some((w) => /balance/i.test(w))).toBe(true)
  })
})
