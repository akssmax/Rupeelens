import { findCatalogMerchant } from "./catalog"

const NOISE = new Set([
  "upi",
  "p2m",
  "p2a",
  "imps",
  "neft",
  "rtgs",
  "nach",
  "ach",
  "pay",
  "paymen",
  "payment",
  "payvia",
  "pay vi",
  "paid",
  "paid v",
  "bank",
  "ltd",
  "limited",
  "india",
  "collect",
  "p2v",
  "yesb",
  "ybs",
  "hdfc",
  "icici",
  "axis",
  "sbi",
  "kotak",
  "yes",
  "indusind",
  "idfc",
  "phonepe",
  "gpay",
  "paytm",
  "bhim",
])

/** Pull a human merchant label from Axis/UPI-style narrations */
export function extractMerchantName(description: string): string {
  const catalog = findCatalogMerchant(description)
  if (catalog) return catalog.name

  const parts = description
    .split(/[\/\\|]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  // UPI/P2M/<id>/<MERCHANT>/...
  if (/^upi$/i.test(parts[0] ?? "")) {
    const candidates = parts.slice(2).filter((p) => {
      const compact = p.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (!compact || compact.length < 3) return false
      if (/^\d+$/.test(compact)) return false
      if (NOISE.has(p.toLowerCase()) || NOISE.has(compact)) return false
      return /[a-zA-Z]/.test(p)
    })
    const best = candidates[0]
    if (best) return titleCase(best.replace(/\s+/g, " ").trim())
  }

  // Fallback: first alphabetic chunk
  const match = description.match(/[A-Za-z][A-Za-z0-9 &.]{2,40}/)
  return match ? titleCase(match[0].trim()) : description.slice(0, 40)
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ")
}
