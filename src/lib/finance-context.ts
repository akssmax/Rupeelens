import {
  availableMonths,
  dailySpends,
  filterByMonth,
  listSubscriptions,
  monthlySummary,
  weeklySpends,
} from "./analytics"
import { formatINR, formatMonthLabel } from "./format"
import type { Transaction } from "./types"

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
