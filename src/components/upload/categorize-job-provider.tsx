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

function categorizeResultMessage(result: CategorizeJobResult): string {
  const base = `Categorized ${result.updated} — rules ${result.rules}, learned ${result.memory}, AI ${result.llm}`
  if (result.errors[0]) return `${base}. ${result.errors[0]}`
  return base
}

export function CategorizeJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<CategorizeJobState>(idleCategorizeJobState)

  const dismiss = useCallback(() => {
    setJob(idleCategorizeJobState)
  }, [])

  const startJob = useCallback(
    async (transactions: Transaction[], options?: StartJobOptions) => {
      if (transactions.length === 0) return null

      const toastId = options?.toastId

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
          dismissed: true,
          progress: {
            phase: "done",
            done: prev.transactionCount,
            total: prev.transactionCount,
            label: `Done — ${result.updated} categorized`,
          },
          result,
        }))

        const categorizeMsg = categorizeResultMessage(result)
        const message = options?.importSummary
          ? `${options.importSummary}. ${categorizeMsg}`
          : categorizeMsg

        if (result.errors.length) {
          toast.warning(message, toastId ? { id: toastId } : undefined)
        } else if (result.updated > 0 || options?.importSummary) {
          toast.success(message, toastId ? { id: toastId } : undefined)
        } else if (toastId) {
          toast.dismiss(toastId)
        }

        return result
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        toast.error(message, toastId ? { id: toastId } : undefined)
        setJob((prev) => ({
          ...prev,
          active: false,
          dismissed: true,
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
