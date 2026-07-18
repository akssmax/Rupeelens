import type { ReactElement } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const ICON_TOOLTIP_DELAY_MS = 500

export function IconButtonTooltip({
  label,
  side = "bottom",
  children,
}: {
  label: string
  side?: "top" | "right" | "bottom" | "left"
  children: ReactElement
}) {
  return (
    <Tooltip delayDuration={ICON_TOOLTIP_DELAY_MS}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
