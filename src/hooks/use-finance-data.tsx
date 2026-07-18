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
import { useAuthSession } from "@/lib/auth/use-auth-session"
import {
  getAllStatements,
  getAllTransactions,
  getCategories,
  createCategory as saveCategory,
  getFinanceStorageMode,
  hasLocalTransactions,
  setFinanceStorageMode,
  updateTransaction,
  updateTransactionsBatch,
} from "@/lib/finance/storage"
import { emitFinanceRefresh, onFinanceRefresh } from "@/lib/finance-events"
import {
  buildCategorizationUpdates,
  type ApplyMerchantCategorizationInput,
  type ApplyMerchantCategorizationResult,
} from "@/lib/chat-categorize"
import { sortCategories } from "@/lib/categories"
import { rememberMerchantMapping, rememberMerchantMappingsBatch } from "@/lib/merchants/memory"
import type { Category, CategoryId, Statement, Transaction } from "@/lib/types"

type FinanceContextValue = {
  transactions: Transaction[]
  transactionCount: number
  getTransactionsSnapshot: () => Transaction[]
  statements: Statement[]
  categories: Category[]
  loading: boolean
  isAuthPending: boolean
  hasLocalData: boolean | null
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
  applyMerchantCategorizations: (
    previews: ApplyMerchantCategorizationInput[],
  ) => Promise<ApplyMerchantCategorizationResult>
  createCategory: (name: string, color?: string) => Promise<Category | null>
  isSignedIn: boolean
  isCloudSynced: boolean
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isPending } = useAuthSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLocalData, setHasLocalData] = useState<boolean | null>(null)
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
      const message = e instanceof Error ? e.message : String(e)
      const cloudAuthFailure =
        getFinanceStorageMode() === "cloud" &&
        (message === "Unauthorized" ||
          message.includes("Session expired") ||
          message.includes("sign in again"))

      if (cloudAuthFailure) {
        setFinanceStorageMode("local")
        try {
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
          setError(
            "Cloud sync unavailable — showing local browser data. Try “Sync local data” from the account menu.",
          )
        } catch (fallbackError) {
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
          )
        }
      } else {
        setError(message)
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const probeLocalData = () => {
      void hasLocalTransactions().then((hasData) => {
        if (!cancelled) setHasLocalData(hasData)
      })
    }
    probeLocalData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isPending) return
    setFinanceStorageMode(isSignedIn ? "cloud" : "local")
    setLoading(true)
    void refresh()
    void hasLocalTransactions().then(setHasLocalData)
  }, [isSignedIn, isPending, refresh])

  useEffect(
    () =>
      onFinanceRefresh(() => {
        void refresh()
        void hasLocalTransactions().then(setHasLocalData)
      }),
    [refresh],
  )

  const months = useMemo(
    () => availableMonths(transactions),
    [transactions],
  )
  const summary = useMemo(
    () => (month ? monthlySummary(transactions, month, categories) : null),
    [transactions, month, categories],
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
        return prev.map((t) =>
          t.id === txId ? { ...t, categoryId, categorySource: "user" } : t,
        )
      })
      try {
        await updateTransaction(txId, {
          categoryId,
          categorySource: "user",
        })
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

  const applyMerchantCategorizations = useCallback(
    async (
      previews: ApplyMerchantCategorizationInput[],
    ): Promise<ApplyMerchantCategorizationResult> => {
      const applicable = previews.filter((preview) => preview.matched.length > 0)
      if (applicable.length === 0) {
        return { updated: 0, merchants: [] }
      }

      const updatesById = new Map<
        string,
        { categoryId: CategoryId; categorySource: "user" }
      >()
      const memoryItems: Array<{
        merchant: string
        description: string
        categoryId: CategoryId
        isSubscription?: boolean
        source: "user"
      }> = []

      for (const preview of applicable) {
        const { updates, memoryItems: items } = buildCategorizationUpdates(
          preview.matched,
          preview.categoryId,
        )
        for (const update of updates) {
          updatesById.set(update.id, {
            categoryId: update.patch.categoryId,
            categorySource: "user",
          })
        }
        memoryItems.push(...items)
      }

      const updateEntries = [...updatesById.entries()]
      setTransactions((prev) =>
        prev.map((tx) => {
          const patch = updatesById.get(tx.id)
          return patch ? { ...tx, ...patch } : tx
        }),
      )

      try {
        await updateTransactionsBatch(
          updateEntries.map(([id, patch]) => ({ id, patch })),
        )
        await rememberMerchantMappingsBatch(memoryItems)
        emitFinanceRefresh()

        const merchants = applicable.map((preview) => ({
          merchantQuery: preview.merchantQuery,
          categoryName: preview.categoryName,
          count: preview.matched.length,
        }))

        return {
          updated: updateEntries.length,
          merchants,
        }
      } catch (e) {
        await refresh()
        throw e
      }
    },
    [refresh],
  )

  const createCategory = useCallback(
    async (name: string, color?: string) => {
      try {
        const category = await saveCategory(name, color)
        setCategories((prev) =>
          prev.some((c) => c.id === category.id)
            ? prev
            : sortCategories([...prev, category]),
        )
        return category
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return null
      }
    },
    [],
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
      isAuthPending: isPending,
      hasLocalData,
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
      applyMerchantCategorizations,
      createCategory,
      isSignedIn,
      isCloudSynced: isSignedIn,
    }),
    [
      transactions,
      transactionCount,
      getTransactionsSnapshot,
      statements,
      categories,
      loading,
      isPending,
      hasLocalData,
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
      applyMerchantCategorizations,
      createCategory,
      isSignedIn,
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
