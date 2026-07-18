import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import {
  runCategorization,
  type CategorizeProgress,
} from "@/lib/categorize-client"
import { emitFinanceRefresh } from "@/lib/finance-events"
import type { Transaction } from "@/lib/types"

export type CategorizeJobResult = {
  updated: number
  rules: number
  memory: number
  llm: number
  errors: string[]
}

type CategorizeJobState = {
  active: boolean
  dismissed: boolean
  label: string
  transactionCount: number
  progress: CategorizeProgress | null
  result: CategorizeJobResult | null
}

type StartJobOptions = {
  force?: boolean
  label?: string
}

type CategorizeJobContextValue = {
  job: CategorizeJobState
  startJob: (
    transactions: Transaction[],
    options?: StartJobOptions,
  ) => Promise<CategorizeJobResult | null>
  dismiss: () => void
}

const idleState: CategorizeJobState = {
  active: false,
  dismissed: false,
  label: "",
  transactionCount: 0,
  progress: null,
  result: null,
}

const CategorizeJobContext = createContext<CategorizeJobContextValue | null>(
  null,
)

export function CategorizeJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<CategorizeJobState>(idleState)

  const dismiss = useCallback(() => {
    setJob(idleState)
  }, [])

  const startJob = useCallback(
    async (transactions: Transaction[], options?: StartJobOptions) => {
      if (transactions.length === 0) return null

      setJob({
        active: true,
        dismissed: false,
        label: options?.label ?? "Processing statement",
        transactionCount: transactions.length,
        progress: {
          phase: "rules",
          done: 0,
          total: transactions.length,
          label: "Starting categorization…",
        },
        result: null,
      })

      try {
        const result = await runCategorization(
          transactions,
          (progress) => {
            setJob((prev) => ({ ...prev, progress }))
          },
          {
            force: options?.force,
            onPhaseComplete: () => emitFinanceRefresh(),
          },
        )

        emitFinanceRefresh()

        setJob((prev) => ({
          ...prev,
          active: false,
          progress: {
            phase: "done",
            done: prev.transactionCount,
            total: prev.transactionCount,
            label: `Done — ${result.updated} categorized`,
          },
          result,
        }))

        if (result.errors.length) {
          toast.warning(
            `Categorized ${result.updated} (rules ${result.rules}, learned ${result.memory}, AI ${result.llm}). ${result.errors[0]}`,
          )
        } else if (result.updated > 0) {
          toast.success(
            `Categorized ${result.updated} — rules ${result.rules}, learned ${result.memory}, AI ${result.llm}`,
          )
        }

        return result
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        toast.error(message)
        setJob((prev) => ({
          ...prev,
          active: false,
          result: {
            updated: 0,
            rules: 0,
            memory: 0,
            llm: 0,
            errors: [message],
          },
        }))
        return null
      }
    },
    [],
  )

  const value = useMemo(
    () => ({ job, startJob, dismiss }),
    [job, startJob, dismiss],
  )

  return (
    <CategorizeJobContext.Provider value={value}>
      {children}
    </CategorizeJobContext.Provider>
  )
}

export function useCategorizeJob() {
  const ctx = useContext(CategorizeJobContext)
  if (!ctx) {
    throw new Error("useCategorizeJob must be used within CategorizeJobProvider")
  }
  return ctx
}
