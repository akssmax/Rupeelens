import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButtonTooltip } from "@/components/ui/icon-button-tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatMonthLabel } from "@/lib/format"

export function MonthSelect({
  months,
  value,
  onChange,
}: {
  months: string[]
  value: string
  onChange: (month: string) => void
}) {
  if (months.length === 0) return null

  // months are newest-first
  const index = Math.max(0, months.indexOf(value))
  const canNewer = index > 0
  const canOlder = index < months.length - 1 && index >= 0

  const goNewer = () => {
    if (canNewer) onChange(months[index - 1]!)
  }
  const goOlder = () => {
    if (canOlder) onChange(months[index + 1]!)
  }

  return (
    <div className="flex items-center gap-1">
      <IconButtonTooltip label="Previous month">
        <span className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!canOlder}
            onClick={goOlder}
          >
            <ChevronLeft />
          </Button>
        </span>
      </IconButtonTooltip>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-w-[160px] justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground size-4" />
              {value ? formatMonthLabel(value) : "Select month"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium tracking-wide uppercase">
            Statement months
          </p>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  m === value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {formatMonthLabel(m)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <IconButtonTooltip label="Next month">
        <span className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            disabled={!canNewer}
            onClick={goNewer}
          >
            <ChevronRight />
          </Button>
        </span>
      </IconButtonTooltip>
    </div>
  )
}
