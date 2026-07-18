import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"

type ShellChromeValue = {
  minimal: boolean
  setMinimal: (minimal: boolean) => void
}

const ShellChromeContext = createContext<ShellChromeValue | null>(null)

export function ShellChromeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [minimal, setMinimalState] = useState(false)
  const setMinimal = useCallback((value: boolean) => {
    setMinimalState(value)
  }, [])
  const value = useMemo(
    () => ({ minimal, setMinimal }),
    [minimal, setMinimal],
  )
  return (
    <ShellChromeContext.Provider value={value}>
      {children}
    </ShellChromeContext.Provider>
  )
}

export function useShellChrome() {
  const ctx = useContext(ShellChromeContext)
  if (!ctx) {
    throw new Error("useShellChrome must be used within ShellChromeProvider")
  }
  return ctx
}

/** Hide app chrome (sidebar, AI FAB) while mounted — used by onboarding. */
export function useMinimalShell(enabled = true) {
  const { setMinimal } = useShellChrome()
  useLayoutEffect(() => {
    if (!enabled) return
    setMinimal(true)
    return () => setMinimal(false)
  }, [enabled, setMinimal])
}
