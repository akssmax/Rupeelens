import { memo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { formatINR } from "@/lib/format"

export const SpendBars = memo(function SpendBars({
  data,
  xKey = "label",
}: {
  data: Array<{ label: string; amount: number }>
  xKey?: string
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No spend data
      </p>
    )
  }

  return (
    <ClientChart className="h-72" minHeight={288}>
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
          formatter={(value) => formatINR(Number(value ?? 0))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        />
        <Bar dataKey="amount" fill="#1f6f5b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ClientChart>
  )
})
