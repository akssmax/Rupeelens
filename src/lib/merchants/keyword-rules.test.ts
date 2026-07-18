import { describe, expect, it } from "vitest"
import { matchKeywordCategory } from "./keyword-rules"

describe("matchKeywordCategory", () => {
  it("detects wine purchases", () => {
    expect(
      matchKeywordCategory("UPI/P2M/123/SULA VINEYARDS/MUMBAI")?.categoryId,
    ).toBe("wine")
    expect(
      matchKeywordCategory("POS WINE SHOP BANGALORE")?.categoryId,
    ).toBe("wine")
  })

  it("detects liquor and bar spends", () => {
    expect(
      matchKeywordCategory("UPI/LIVING LIQUIDZ MUMBAI")?.categoryId,
    ).toBe("alcohol")
    expect(matchKeywordCategory("BEER CAFE INDIRANAGAR")?.categoryId).toBe(
      "alcohol",
    )
    expect(matchKeywordCategory("IMFL STORE PAYMENT")?.categoryId).toBe(
      "alcohol",
    )
  })

  it("prefers wine over generic alcohol keywords when wine-specific", () => {
    expect(matchKeywordCategory("GROVER ZAMPA WINES")?.categoryId).toBe("wine")
  })
})
