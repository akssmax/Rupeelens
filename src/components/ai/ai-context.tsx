import { createContext, useCallback, useContext, useMemo, useState } from "react"

type AiContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  openAi: () => void
}

const AiContext = createContext<AiContextValue | null>(null)

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openAi = useCallback(() => setOpen(true), [])
  const value = useMemo(
    () => ({
      open,
      setOpen,
      openAi,
    }),
    [open, openAi],
  )
  return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}

export function useAiPanel() {
  const ctx = useContext(AiContext)
  if (!ctx) {
    throw new Error("useAiPanel must be used within AiProvider")
  }
  return ctx
}
