import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DrillDownPageHeader({
  title,
  backTo = "/",
  backLabel = "Dashboard",
  actions,
  className,
}: {
  title: string
  backTo?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          asChild
        >
          <Link to={backTo} aria-label={`Back to ${backLabel}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-heading min-w-0 truncate text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
