import { useCallback, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { runCategorization } from "@/lib/categorize-client"
import { emitFinanceRefresh } from "@/lib/finance-events"
import type { Transaction } from "@/lib/types"
import {
  CategorizeJobContext,
  idleCategorizeJobState,
  type CategorizeJobResult,
  type CategorizeJobState,
  type StartJobOptions,
} from "./categorize-job-context"

export function CategorizeJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<CategorizeJobState>(idleCategorizeJobState)

  const dismiss = useCallback(() => {
    setJob(idleCategorizeJobState)
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
          } satisfies CategorizeJobResult,
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
