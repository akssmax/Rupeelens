import { describe, expect, it } from "vitest"
import { pickField } from "./normalize"

describe("pickField", () => {
  it("does not match CR inside MICR", () => {
    const row = { MICR: "123456", CR: "500.00", DR: "" }
    expect(pickField(row, ["CR", "Credit"])).toBe("500.00")
  })

  it("does not match DR inside Address", () => {
    const row = { Address: "12 Main Dr", DR: "100.00", CR: "" }
    expect(pickField(row, ["DR", "Debit"])).toBe("100.00")
  })

  it("prefers exact match over substring for longer aliases", () => {
    const row = {
      "Debit Amount": "10",
      Debit: "20",
    }
    expect(pickField(row, ["Debit", "Debit Amount"])).toBe("20")
  })

  it("falls back to includes for longer aliases when exact missing", () => {
    const row = { "Withdrawal Amt": "75" }
    expect(pickField(row, ["Withdrawal"])).toBe("75")
  })
})
