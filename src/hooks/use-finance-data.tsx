import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  availableMonths,
  creditsVsDebits,
  dailySpends,
  listSubscriptions,
  monthlySummary,
  weeklySpends,
} from "@/lib/analytics"
import {
  getAllStatements,
  getAllTransactions,
  getCategories,
  updateTransaction,
} from "@/lib/db"
import { onFinanceRefresh } from "@/lib/finance-events"
import { rememberMerchantMapping } from "@/lib/merchants/memory"
import type { Category, CategoryId, Statement, Transaction } from "@/lib/types"

type FinanceContextValue = {
  transactions: Transaction[]
  transactionCount: number
  getTransactionsSnapshot: () => Transaction[]
  statements: Statement[]
  categories: Category[]
  loading: boolean
  error: string | null
  month: string
  setMonth: (month: string) => void
  months: string[]
  summary: ReturnType<typeof monthlySummary> | null
  weekly: ReturnType<typeof weeklySpends>
  daily: ReturnType<typeof dailySpends>
  flow: ReturnType<typeof creditsVsDebits>
  subscriptions: ReturnType<typeof listSubscriptions>
  refresh: () => Promise<void>
  changeCategory: (
    txId: string,
    categoryId: CategoryId,
    merchant?: string,
  ) => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const transactionsRef = useRef(transactions)
  transactionsRef.current = transactions

  const getTransactionsSnapshot = useCallback(
    () => transactionsRef.current,
    [],
  )

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      setError(null)
      const [txs, stmts, cats] = await Promise.all([
        getAllTransactions(),
        getAllStatements(),
        getCategories(),
      ])
      if (id !== requestId.current) return
      setTransactions(txs)
      setStatements(stmts)
      setCategories(cats)
      const nextMonths = availableMonths(txs)
      setMonth((prev) => {
        if (prev && nextMonths.includes(prev)) return prev
        return nextMonths[0] ?? ""
      })
    } catch (e) {
      if (id !== requestId.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => onFinanceRefresh(() => void refresh()), [refresh])

  const months = useMemo(
    () => availableMonths(transactions),
    [transactions],
  )
  const summary = useMemo(
    () => (month ? monthlySummary(transactions, month) : null),
    [transactions, month],
  )
  const weekly = useMemo(
    () => (month ? weeklySpends(transactions, month) : []),
    [transactions, month],
  )
  const daily = useMemo(
    () => (month ? dailySpends(transactions, month) : []),
    [transactions, month],
  )
  const flow = useMemo(
    () => creditsVsDebits(transactions, month || undefined),
    [transactions, month],
  )
  const subscriptions = useMemo(
    () => listSubscriptions(transactions),
    [transactions],
  )

  const changeCategory = useCallback(
    async (txId: string, categoryId: CategoryId, merchant?: string) => {
      let memoryTarget: Transaction | undefined
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId)
        if (tx) memoryTarget = tx
        return prev.map((t) => (t.id === txId ? { ...t, categoryId } : t))
      })
      try {
        await updateTransaction(txId, { categoryId })
        if (memoryTarget) {
          const merchantName =
            merchant || memoryTarget.merchant || memoryTarget.description
          await rememberMerchantMapping({
            merchant: merchantName,
            description: memoryTarget.description,
            categoryId,
            isSubscription: categoryId === "subscriptions",
            source: "user",
          })
        }
      } catch {
        await refresh()
      }
    },
    [refresh],
  )

  const transactionCount = transactions.length

  const value = useMemo<FinanceContextValue>(
    () => ({
      transactions,
      transactionCount,
      getTransactionsSnapshot,
      statements,
      categories,
      loading,
      error,
      month,
      setMonth,
      months,
      summary,
      weekly,
      daily,
      flow,
      subscriptions,
      refresh,
      changeCategory,
    }),
    [
      transactions,
      transactionCount,
      getTransactionsSnapshot,
      statements,
      categories,
      loading,
      error,
      month,
      months,
      summary,
      weekly,
      daily,
      flow,
      subscriptions,
      refresh,
      changeCategory,
    ],
  )

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}

export function useFinanceData(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) {
    throw new Error("useFinanceData must be used within FinanceProvider")
  }
  return ctx
}
