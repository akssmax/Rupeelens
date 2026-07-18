import { memo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { AmountChartTooltip } from "@/components/charts/chart-tooltip"
import type { SpendChartDatum } from "@/lib/chart-types"

export const SpendBars = memo(function SpendBars({
  data,
  xKey = "label",
}: {
  data: SpendChartDatum[]
  xKey?: string
}) {
  const navigate = useNavigate()

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No spend data
      </p>
    )
  }

  const openSpend = (entry: SpendChartDatum) => {
    if (entry.date) {
      void navigate({ to: "/transactions", search: { date: entry.date } })
      return
    }
    if (entry.weekKey) {
      void navigate({ to: "/transactions", search: { week: entry.weekKey } })
    }
  }

  return (
    <ClientChart fill minHeight={288}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e0d8" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-IN", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(Number(v))
          }
          width={48}
        />
        <Tooltip
          content={
            <AmountChartTooltip hint="Click to view transactions for this period" />
          }
        />
        <Bar
          dataKey="amount"
          fill="#1f6f5b"
          radius={[4, 4, 0, 0]}
          cursor="pointer"
          className="transition-opacity hover:opacity-80"
          onClick={(bar) => {
            const entry = bar.payload as SpendChartDatum | undefined
            if (entry) openSpend(entry)
          }}
        />
      </BarChart>
    </ClientChart>
  )
})
