import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type UploadContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  openUpload: () => void
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openUpload = useCallback(() => setOpen(true), [])
  const value = useMemo(
    () => ({ open, setOpen, openUpload }),
    [open, openUpload],
  )
  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  )
}

export function useUploadPanel() {
  const ctx = useContext(UploadContext)
  if (!ctx) {
    throw new Error("useUploadPanel must be used within UploadProvider")
  }
  return ctx
}
