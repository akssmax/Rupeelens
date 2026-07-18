import { formatINR } from "@/lib/format"

export function chartTooltipStyle() {
  return {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--background)",
  } as const
}

export function CategoryChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null

  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {formatINR(Number(item.value ?? 0))}
      </p>
      <p className="text-muted-foreground mt-1">Click to view transactions</p>
    </div>
  )
}

export function AmountChartTooltip({
  active,
  payload,
  label,
  hint = "Click to view transactions",
}: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string; color?: string }>
  label?: string
  hint?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null

  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      {label ? <p className="font-medium">{label}</p> : null}
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {formatINR(Number(item.value ?? 0))}
      </p>
      {hint ? (
        <p className="text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

export function CashflowChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const flowLabel = item.name === "income" ? "Income" : "Expense"

  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="font-medium">
        {label ? `${label} · ` : ""}
        {flowLabel}
      </p>
      <p className="text-muted-foreground mt-0.5 tabular-nums">
        {formatINR(Number(item.value ?? 0))}
      </p>
      <p className="text-muted-foreground mt-1">Click to view {flowLabel.toLowerCase()}</p>
    </div>
  )
}
