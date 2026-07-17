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
) as Record<CategoryId, Category>

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId)
}

export function normalizeCategory(value: string): CategoryId {
  const key = value.trim().toLowerCase().replace(/\s+/g, "_")
  if (isCategoryId(key)) return key
  const byName = SEED_CATEGORIES.find(
    (c) => c.name.toLowerCase() === value.trim().toLowerCase(),
  )
  return byName?.id ?? "other"
}
