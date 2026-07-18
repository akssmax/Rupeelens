import type { Category, CategoryId } from "./types"

export const SEED_CATEGORIES: Category[] = [
  { id: "food", name: "Food", color: "#e76f51" },
  { id: "groceries", name: "Groceries", color: "#2a9d8f" },
  { id: "transport", name: "Transport", color: "#e9c46a" },
  { id: "shopping", name: "Shopping", color: "#f4a261" },
  { id: "rent", name: "Rent", color: "#264653" },
  { id: "utilities", name: "Utilities", color: "#457b9d" },
  { id: "entertainment", name: "Entertainment", color: "#9b5de5" },
  { id: "health", name: "Health", color: "#ef476f" },
  { id: "travel", name: "Travel", color: "#118ab2" },
  { id: "wine", name: "Wine", color: "#722f37" },
  { id: "alcohol", name: "Alcohol", color: "#6a040f" },
  { id: "transfers", name: "Transfers", color: "#6c757d" },
  { id: "salary", name: "Salary", color: "#06d6a0" },
  { id: "investments", name: "Investments", color: "#073b4c" },
  { id: "subscriptions", name: "Subscriptions", color: "#ffd166" },
  { id: "fees", name: "Fees", color: "#adb5bd" },
  { id: "cash", name: "Cash", color: "#8d99ae" },
  { id: "other", name: "Other", color: "#495057" },
  { id: "uncategorized", name: "Uncategorized", color: "#ced4da" },
]

export const CATEGORY_IDS = SEED_CATEGORIES.map((c) => c.id)

export const CATEGORY_MAP = Object.fromEntries(
  SEED_CATEGORIES.map((c) => [c.id, c]),
) as Record<string, Category>

export const CUSTOM_CATEGORY_COLORS = [
  "#e63946",
  "#457b9d",
  "#2a9d8f",
  "#e9c46a",
  "#9b5de5",
  "#f4845f",
  "#06d6a0",
  "#7209b7",
  "#fb8500",
  "#588157",
]

export function buildCategoryMap(
  categories: Category[],
): Record<string, Category> {
  return Object.fromEntries(categories.map((c) => [c.id, c]))
}

export function mergeCategories(
  customCategories: Category[] = [],
): Category[] {
  const custom = customCategories.filter((c) => c.custom)
  return sortCategories([...SEED_CATEGORIES, ...custom])
}

export function sortCategories(categories: Category[]): Category[] {
  const seedOrder = new Map(SEED_CATEGORIES.map((c, i) => [c.id, i]))
  return [...categories].sort((a, b) => {
    const aCustom = a.custom ? 1 : 0
    const bCustom = b.custom ? 1 : 0
    if (aCustom !== bCustom) return aCustom - bCustom
    if (!a.custom && !b.custom) {
      return (seedOrder.get(a.id) ?? 999) - (seedOrder.get(b.id) ?? 999)
    }
    return a.name.localeCompare(b.name)
  })
}

export function slugifyCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  return `custom_${base || "category"}`
}

export function pickCustomCategoryColor(index = 0): string {
  return CUSTOM_CATEGORY_COLORS[index % CUSTOM_CATEGORY_COLORS.length]!
}

export function isCategoryId(
  value: string,
  knownCategories?: Category[],
): value is CategoryId {
  if (CATEGORY_IDS.includes(value)) return true
  return Boolean(knownCategories?.some((c) => c.id === value))
}

export function normalizeCategory(
  value: string,
  knownCategories?: Category[],
): CategoryId {
  const trimmed = value.trim()
  const key = trimmed.toLowerCase().replace(/\s+/g, "_")
  if (isCategoryId(key, knownCategories)) return key

  const byName = (knownCategories ?? SEED_CATEGORIES).find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (byName) return byName.id

  const aliases: Record<string, CategoryId> = {
    dining: "food",
    restaurant: "food",
    grocery: "groceries",
    commute: "transport",
    liquor: "alcohol",
    beer: "alcohol",
    bar: "alcohol",
    pub: "alcohol",
    winery: "wine",
    vineyards: "wine",
  }
  if (aliases[key]) return aliases[key]

  return "other"
}

export function resolveCategoryName(
  categoryId: string,
  categoryMap?: Record<string, Category>,
): string {
  const map = categoryMap ?? CATEGORY_MAP
  return map[categoryId]?.name ?? categoryId
}
