import {
  availableMonths,
  dailySpends,
  filterByMonth,
  listSubscriptions,
  monthlySummary,
  weeklySpends,
} from "./analytics"
import { mergeCategories, resolveCategoryName, SEED_CATEGORIES } from "./categories"
import { formatINR, formatMonthLabel } from "./format"
import { extractMerchantName } from "./merchants/extract"
import type { Category, Transaction } from "./types"

export function isNeedsReviewTransaction(tx: Transaction): boolean {
  return tx.categoryId === "uncategorized" || !tx.merchant
}

/** Merchant ledger for chat categorization — includes already-mapped merchants. */
export function buildMerchantCategoryContext(
  transactions: Transaction[],
  categories: Category[] = [],
): string {
  if (transactions.length === 0) {
    return "No transactions imported yet."
  }

  const byMerchant = new Map<
    string,
    {
      categoryId: string
      count: number
      total: number
      lastDate: string
    }
  >()

  for (const tx of transactions) {
    const merchant = tx.merchant || extractMerchantName(tx.description) || "Unknown"
    const prev = byMerchant.get(merchant) ?? {
      categoryId: tx.categoryId,
      count: 0,
      total: 0,
      lastDate: "",
    }
    prev.count += 1
    prev.total += tx.debit > 0 ? tx.debit : tx.credit
    if (tx.date > prev.lastDate) prev.lastDate = tx.date
    if (prev.categoryId === "uncategorized" && tx.categoryId !== "uncategorized") {
      prev.categoryId = tx.categoryId
    }
    byMerchant.set(merchant, prev)
  }

  const merchantLines = [...byMerchant.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 80)
    .map(([merchant, stats]) => {
      const categoryName =
        resolveCategoryName(stats.categoryId) || stats.categoryId
      return `${merchant} | ${categoryName} | ${stats.count} txns | ${formatINR(stats.total)} | last ${stats.lastDate}`
    })

  const uncategorizedCount = transactions.filter(
    (tx) => tx.categoryId === "uncategorized" || !tx.merchant,
  ).length

  const allCategories = categories.length
    ? mergeCategories(categories.filter((c) => c.custom))
    : SEED_CATEGORIES
  const categoryLines = allCategories
    .filter((c) => c.id !== "uncategorized")
    .map((c) => `${c.id}: ${c.name}`)

  return [
    `Total transactions: ${transactions.length}`,
    `Uncategorized: ${uncategorizedCount}`,
    "## Merchants (current category)",
    ...merchantLines,
    "## Available categories",
    ...categoryLines,
  ].join("\n")
}

/** Compact list of uncategorized merchants for chat categorization intent parsing. */
export function buildUncategorizedMerchantsContext(
  transactions: Transaction[],
  categories: Category[] = [],
): string {
  const uncategorized = transactions.filter(isNeedsReviewTransaction)
  if (uncategorized.length === 0) {
    return "No uncategorized transactions."
  }

  const byMerchant = new Map<
    string,
    { count: number; total: number; lastDate: string }
  >()

  for (const tx of uncategorized) {
    const merchant = tx.merchant || extractMerchantName(tx.description) || "Unknown"
    const prev = byMerchant.get(merchant) ?? {
      count: 0,
      total: 0,
      lastDate: "",
    }
    prev.count += 1
    prev.total += tx.debit > 0 ? tx.debit : tx.credit
    if (tx.date > prev.lastDate) prev.lastDate = tx.date
    byMerchant.set(merchant, prev)
  }

  const merchantLines = [...byMerchant.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(
      ([merchant, stats]) =>
        `${merchant} | ${stats.count} txns | ${formatINR(stats.total)} | last ${stats.lastDate}`,
    )

  const allCategories = categories.length
    ? mergeCategories(categories.filter((c) => c.custom))
    : SEED_CATEGORIES
  const categoryLines = allCategories
    .filter((c) => c.id !== "uncategorized")
    .map((c) => `${c.id}: ${c.name}`)

  return [
    `Uncategorized transactions: ${uncategorized.length}`,
    "## Merchants needing review",
    ...merchantLines,
    "## Available categories",
    ...categoryLines,
  ].join("\n")
}

/** Compact snapshot sent with AI chat (no raw CSV / PII headers). */
export function buildFinanceContext(transactions: Transaction[]): string {
  if (transactions.length === 0) {
    return "No transactions imported yet."
  }

  const months = availableMonths(transactions).slice(0, 6)
  const parts: string[] = [
    `Total transactions: ${transactions.length}`,
    `Months available: ${months.map(formatMonthLabel).join(", ")}`,
  ]

  for (const month of months.slice(0, 3)) {
    const s = monthlySummary(transactions, month)
    parts.push(
      [
        `## ${formatMonthLabel(month)}`,
        `Income: ${formatINR(s.totalCredit)}`,
        `Expenses: ${formatINR(s.totalDebit)}`,
        `Net: ${formatINR(s.net)}`,
        `Top categories: ${s.byCategory
          .slice(0, 6)
          .map((c) => `${c.name} ${formatINR(c.amount)}`)
          .join("; ")}`,
        `Top merchants: ${s.topMerchants
          .slice(0, 6)
          .map((m) => `${m.merchant} ${formatINR(m.amount)}`)
          .join("; ")}`,
      ].join("\n"),
    )
  }

  const subs = listSubscriptions(transactions).slice(0, 12)
  if (subs.length) {
    parts.push(
      `## Subscriptions\n${subs
        .map(
          (s) =>
            `${s.merchant}: ~${formatINR(s.avgAmount)}/mo (${s.count} txns, last ${s.lastDate})`,
        )
        .join("\n")}`,
    )
  }

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
  parts.push(
    `## Recent transactions (newest first)\n${recent
      .map((t) => {
        const amt =
          t.credit > 0 ? `+${formatINR(t.credit)}` : `-${formatINR(t.debit)}`
        return `${t.date} | ${amt} | ${t.categoryId} | ${t.merchant || t.description.slice(0, 60)}`
      })
      .join("\n")}`,
  )

  return parts.join("\n\n")
}

/** Month-focused snapshot for Trends AI insights. */
export function buildTrendsContext(
  transactions: Transaction[],
  month: string,
): string {
  const s = monthlySummary(transactions, month)
  const daily = dailySpends(transactions, month)
  const weekly = weeklySpends(transactions, month)
  const monthTxs = filterByMonth(transactions, month)
  const subs = listSubscriptions(transactions).filter((sub) =>
    monthTxs.some(
      (t) =>
        (t.merchant || t.description)
          .toLowerCase()
          .includes(sub.merchant.toLowerCase().slice(0, 12)),
    ),
  )

  const peakDays = [...daily]
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const parts = [
    `## ${formatMonthLabel(month)}`,
    `Income: ${formatINR(s.totalCredit)}`,
    `Expenses: ${formatINR(s.totalDebit)}`,
    `Net: ${formatINR(s.net)}`,
    `Transactions: ${s.txCount}`,
    `Categories: ${s.byCategory
      .slice(0, 8)
      .map((c) => `${c.name} ${formatINR(c.amount)}`)
      .join("; ")}`,
    `Top merchants: ${s.topMerchants
      .map((m) => `${m.merchant} ${formatINR(m.amount)} (${m.count}x)`)
      .join("; ")}`,
    `Peak spend days: ${
      peakDays.length
        ? peakDays.map((d) => `${d.label} ${formatINR(d.amount)}`).join("; ")
        : "none"
    }`,
    `Weekly spends: ${
      weekly.length
        ? weekly.map((w) => `${w.label} ${formatINR(w.amount)}`).join("; ")
        : "none"
    }`,
  ]

  if (subs.length) {
    parts.push(
      `Active subscriptions: ${subs
        .slice(0, 10)
        .map((sub) => `${sub.merchant} ~${formatINR(sub.avgAmount)}/mo`)
        .join("; ")}`,
    )
  }

  const largest = [...monthTxs]
    .filter((t) => t.debit > 0)
    .sort((a, b) => b.debit - a.debit)
    .slice(0, 12)
  if (largest.length) {
    parts.push(
      `Largest debits:\n${largest
        .map(
          (t) =>
            `${t.date} ${formatINR(t.debit)} ${t.categoryId} ${t.merchant || t.description.slice(0, 50)}`,
        )
        .join("\n")}`,
    )
  }

  return parts.join("\n")
}
