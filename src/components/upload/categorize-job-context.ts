import { createContext, useContext } from "react"
import type { CategorizeProgress } from "@/lib/categorize-client"
import type { Transaction } from "@/lib/types"

export type CategorizeJobResult = {
  updated: number
  rules: number
  memory: number
  llm: number
  errors: string[]
}

export type CategorizeJobState = {
  active: boolean
  dismissed: boolean
  label: string
  transactionCount: number
  progress: CategorizeProgress | null
  result: CategorizeJobResult | null
}

export type StartJobOptions = {
  force?: boolean
  label?: string
}

export type CategorizeJobContextValue = {
  job: CategorizeJobState
  startJob: (
    transactions: Transaction[],
    options?: StartJobOptions,
  ) => Promise<CategorizeJobResult | null>
  dismiss: () => void
}

export const idleCategorizeJobState: CategorizeJobState = {
  active: false,
  dismissed: false,
  label: "",
  transactionCount: 0,
  progress: null,
  result: null,
}

export const CategorizeJobContext =
  createContext<CategorizeJobContextValue | null>(null)

export function useCategorizeJob() {
  const ctx = useContext(CategorizeJobContext)
  if (!ctx) {
    throw new Error("useCategorizeJob must be used within CategorizeJobProvider")
  }
  return ctx
}
