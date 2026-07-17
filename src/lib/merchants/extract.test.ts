import { describe, expect, it } from "vitest"
import { findCatalogMerchant } from "./catalog"
import { extractMerchantName } from "./extract"

describe("merchant extraction", () => {
  it("detects Blinkit from Axis UPI narration", () => {
    const d = "UPI/P2M/708476283828/Blinkit /Pay vi/HDFC BANK LTD"
    expect(findCatalogMerchant(d)?.id).toBe("blinkit")
    expect(extractMerchantName(d)).toBe("Blinkit")
    expect(findCatalogMerchant(d)?.categoryId).toBe("groceries")
  })

  it("detects Swiggy from Axis UPI narration", () => {
    const d = "UPI/P2M/554550178246/SWIGGY /Paymen/ICICI Bank"
    expect(findCatalogMerchant(d)?.id).toBe("swiggy")
    expect(extractMerchantName(d)).toBe("Swiggy")
    expect(findCatalogMerchant(d)?.categoryId).toBe("food")
  })
})
