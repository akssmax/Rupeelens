import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfMonth,
} from "date-fns"
import { buildCategoryMap, CATEGORY_MAP } from "./categories"
import { extractMerchantName } from "./merchants/extract"
import type { Category, CategoryId, Transaction } from "./types"

export interface MonthlySummary {
  month: string
  totalCredit: number
  totalDebit: number
  net: number
  byCategory: Array<{
    categoryId: CategoryId
    name: string
    color: string
    amount: number
  }>
  topMerchants: Array<{
    merchant: string
    amount: number
    count: number
    categoryId: CategoryId
  }>
  txCount: number
}

export interface WeekSpend {
  weekKey: string
  label: string
  amount: number
}

export interface DaySpend {
  date: string
  label: string
  amount: number
}

export interface SubscriptionGroup {
  merchant: string
  categoryId: CategoryId
  avgAmount: number
  count: number
  lastDate: string
  amounts: number[]
}

export function filterByMonth(
  txs: Transaction[],
  month: string,
): Transaction[] {
  return txs.filter((t) => t.date.startsWith(month))
}

export function availableMonths(txs: Transaction[]): string[] {
  const set = new Set(txs.map((t) => t.date.slice(0, 7)))
  return [...set].sort().reverse()
}

export function monthlySummary(
  txs: Transaction[],
  month: string,
  categories?: Category[],
): MonthlySummary {
  const categoryMap = categories ? buildCategoryMap(categories) : CATEGORY_MAP
  const monthTxs = filterByMonth(txs, month)
  let totalCredit = 0
  let totalDebit = 0
  const catMap = new Map<CategoryId, number>()
  const merchantMap = new Map<
    string,
    { amount: number; count: number; categoryId: CategoryId }
  >()

  for (const t of monthTxs) {
    totalCredit += t.credit
    totalDebit += t.debit
    if (t.debit > 0) {
      const cat = t.categoryId || "uncategorized"
      catMap.set(cat, (catMap.get(cat) ?? 0) + t.debit)
      const merchant = t.merchant || extractMerchantName(t.description)
      const prev = merchantMap.get(merchant) ?? {
        amount: 0,
        count: 0,
        categoryId: cat,
      }
      merchantMap.set(merchant, {
        amount: prev.amount + t.debit,
        count: prev.count + 1,
        categoryId: prev.categoryId === "uncategorized" ? cat : prev.categoryId,
      })
    }
  }

  const byCategory = [...catMap.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryMap[categoryId]?.name ?? categoryId,
      color: categoryMap[categoryId]?.color ?? "#ced4da",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  return {
    month,
    totalCredit,
    totalDebit,
    net: totalCredit - totalDebit,
    byCategory,
    topMerchants,
    txCount: monthTxs.length,
  }
}

export function weeklySpends(txs: Transaction[], month: string): WeekSpend[] {
  const monthTxs = filterByMonth(txs, month).filter((t) => t.debit > 0)
  const weeks = new Map<string, number>()

  for (const t of monthTxs) {
    const d = parseISO(t.date)
    const week = getISOWeek(d)
    const year = getISOWeekYear(d)
    const key = `${year}-W${String(week).padStart(2, "0")}`
    weeks.set(key, (weeks.get(key) ?? 0) + t.debit)
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, amount]) => ({
      weekKey,
      label: weekKey.replace("-", " "),
      amount,
    }))
}

export function dailySpends(txs: Transaction[], month: string): DaySpend[] {
  const monthTxs = filterByMonth(txs, month).filter((t) => t.debit > 0)
  const start = startOfMonth(parseISO(`${month}-01`))
  const end = endOfMonth(start)
  const days = eachDayOfInterval({ start, end })
  const byDay = new Map<string, number>()

  for (const t of monthTxs) {
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.debit)
  }

  return days.map((d) => {
    const date = format(d, "yyyy-MM-dd")
    return {
      date,
      label: format(d, "dd MMM"),
      amount: byDay.get(date) ?? 0,
    }
  })
}

export function weeklyCashflow(
  txs: Transaction[],
  month: string,
): Array<{ label: string; income: number; expense: number }> {
  const monthTxs = filterByMonth(txs, month)
  const weeks = new Map<string, { income: number; expense: number }>()

  for (const t of monthTxs) {
    const d = parseISO(t.date)
    const week = getISOWeek(d)
    const year = getISOWeekYear(d)
    const key = `${year}-W${String(week).padStart(2, "0")}`
    const prev = weeks.get(key) ?? { income: 0, expense: 0 }
    prev.income += t.credit
    prev.expense += t.debit
    weeks.set(key, prev)
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, v]) => ({
      label: `W${weekKey.split("-W")[1]}`,
      income: v.income,
      expense: v.expense,
    }))
}

export function creditsVsDebits(txs: Transaction[], month?: string) {
  const scoped = month ? filterByMonth(txs, month) : txs
  const credits = scoped
    .filter((t) => t.credit > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  const debits = scoped
    .filter((t) => t.debit > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  return {
    credits,
    debits,
    totalCredit: credits.reduce((s, t) => s + t.credit, 0),
    totalDebit: debits.reduce((s, t) => s + t.debit, 0),
  }
}

export function listSubscriptions(txs: Transaction[]): SubscriptionGroup[] {
  const flagged = txs.filter(
    (t) => t.debit > 0 && (t.isSubscription || t.categoryId === "subscriptions"),
  )

  // Also detect recurring: same merchant, similar amount, >= 2 occurrences
  const debitTxs = txs.filter((t) => t.debit > 0 && t.merchant)
  const byMerchant = new Map<string, Transaction[]>()
  for (const t of debitTxs) {
    const key = (t.merchant || "").toLowerCase()
    if (!key) continue
    const list = byMerchant.get(key) ?? []
    list.push(t)
    byMerchant.set(key, list)
  }

  const groups = new Map<string, SubscriptionGroup>()

  for (const t of flagged) {
    const key = (t.merchant || t.description).toLowerCase().slice(0, 60)
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      existing.amounts.push(t.debit)
      existing.avgAmount =
        existing.amounts.reduce((a, b) => a + b, 0) / existing.amounts.length
      if (t.date > existing.lastDate) existing.lastDate = t.date
    } else {
      groups.set(key, {
        merchant: t.merchant || t.description.slice(0, 40),
        categoryId: t.categoryId,
        avgAmount: t.debit,
        count: 1,
        lastDate: t.date,
        amounts: [t.debit],
      })
    }
  }

  for (const [key, list] of byMerchant) {
    if (list.length < 2) continue
    const amounts = list.map((t) => t.debit)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    if (avg === 0) continue
    const similar = amounts.every((a) => Math.abs(a - avg) / avg < 0.15)
    if (!similar) continue
    if (groups.has(key)) continue
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
    groups.set(key, {
      merchant: sorted[0]!.merchant || key,
      categoryId: sorted[0]!.categoryId,
      avgAmount: avg,
      count: list.length,
      lastDate: sorted[0]!.date,
      amounts,
    })
  }

  return [...groups.values()].sort((a, b) => b.avgAmount - a.avgAmount)
}
