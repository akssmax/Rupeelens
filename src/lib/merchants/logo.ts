import { findCatalogMerchant } from "./catalog"
import type { CategoryId } from "../types"

/** Only known catalog merchants get favicon URLs — no guessed domains. */
export function merchantLogoUrl(
  merchantName?: string,
  description?: string,
): string | undefined {
  const text = `${merchantName ?? ""} ${description ?? ""}`.trim()
  if (!text) return undefined
  const profile = findCatalogMerchant(text)
  if (!profile?.domain) return undefined
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(profile.domain)}&sz=128`
}

export function merchantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

/** Heuristic: person-to-person transfer / personal name */
export function looksLikePersonName(
  merchant?: string,
  description?: string,
): boolean {
  const desc = (description ?? "").toUpperCase()
  if (/\bP2A\b/.test(desc) || /BANK ACCOUNT XXX/.test(desc)) return true

  const name = (merchant ?? "").trim()
  if (!name || name.length < 3) return false
  if (findCatalogMerchant(name)) return false

  // Brand-like single tokens (SWIGGY, BLINKIT) are usually uppercase brands
  if (/^[A-Z0-9&.-]{2,20}$/.test(name) && !name.includes(" ")) return false

  // "Gaurav Kumar Chaudhar" style
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && words.every((w) => /^[A-Za-z.]+$/.test(w))) {
    return true
  }

  // Single capitalized personal-looking token without catalog hit
  if (
    words.length === 1 &&
    /^[A-Z][a-z]+$/.test(words[0]!) &&
    words[0]!.length >= 4
  ) {
    return true
  }

  return false
}

export function categoryAccent(categoryId?: CategoryId): string {
  const map: Partial<Record<CategoryId, string>> = {
    food: "bg-orange-100 text-orange-700",
    groceries: "bg-emerald-100 text-emerald-700",
    transport: "bg-amber-100 text-amber-800",
    shopping: "bg-rose-100 text-rose-700",
    rent: "bg-slate-200 text-slate-700",
    utilities: "bg-sky-100 text-sky-700",
    entertainment: "bg-violet-100 text-violet-700",
    health: "bg-pink-100 text-pink-700",
    travel: "bg-cyan-100 text-cyan-800",
    transfers: "bg-stone-200 text-stone-700",
    salary: "bg-teal-100 text-teal-800",
    investments: "bg-indigo-100 text-indigo-800",
    subscriptions: "bg-yellow-100 text-yellow-800",
    fees: "bg-neutral-200 text-neutral-700",
    cash: "bg-lime-100 text-lime-800",
    other: "bg-muted text-muted-foreground",
    uncategorized: "bg-muted text-muted-foreground",
  }
  return map[categoryId ?? "uncategorized"] ?? "bg-muted text-muted-foreground"
}
