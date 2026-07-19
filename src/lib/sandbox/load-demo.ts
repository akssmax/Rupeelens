import { createClientOnlyFn } from "@tanstack/react-start"
import { clearAllData, setFinanceStorageMode } from "@/lib/finance/storage"
import { importCsvFile } from "@/lib/import"
import { DEMO_CSV, DEMO_FILENAME } from "@/lib/sandbox/demo-statement"

export const SANDBOX_FLAG_KEY = "rupeelens-sandbox"

export function isSandboxMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(SANDBOX_FLAG_KEY) === "1"
  } catch {
    return false
  }
}

export function setSandboxMode(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (enabled) sessionStorage.setItem(SANDBOX_FLAG_KEY, "1")
    else sessionStorage.removeItem(SANDBOX_FLAG_KEY)
  } catch {
    /* private mode / blocked storage */
  }
}

/** Load mock Axis CSV into local IndexedDB for signed-out exploration. */
export const loadSandboxDemo = createClientOnlyFn(async () => {
  setFinanceStorageMode("local")
  setSandboxMode(true)

  const result = await importCsvFile({
    text: DEMO_CSV,
    filename: DEMO_FILENAME,
    bankOverride: "axis",
  })

  return result
})

/** Clear demo (and any local) data and leave sandbox mode. */
export const exitSandboxDemo = createClientOnlyFn(async () => {
  await clearAllData()
  setSandboxMode(false)
  setFinanceStorageMode("local")
})
