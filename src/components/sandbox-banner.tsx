import { useState } from "react"
import { FlaskConical, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { exitSandboxDemo, isSandboxMode } from "@/lib/sandbox/load-demo"

export function SandboxBanner() {
  const [active] = useState(() => isSandboxMode())
  const [exiting, setExiting] = useState(false)

  if (!active) return null

  const exit = async () => {
    setExiting(true)
    try {
      await exitSandboxDemo()
      emitFinanceRefresh()
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="border-border/80 bg-muted/40 flex items-center gap-3 border-b px-3 py-2 text-sm sm:px-4">
      <p className="text-muted-foreground flex min-w-0 flex-1 items-start gap-2 sm:items-center">
        <FlaskConical className="text-foreground mt-0.5 size-4 shrink-0 sm:mt-0" />
        <span className="min-w-0 truncate leading-snug">
          <span className="text-foreground font-medium">Demo mode</span>
          {" — "}
          sample data in this browser
        </span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0"
        disabled={exiting}
        onClick={() => void exit()}
      >
        {exiting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" />
        )}
        Exit demo
      </Button>
    </div>
  )
}
