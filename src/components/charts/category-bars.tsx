import { memo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { formatINR } from "@/lib/format"

export const CategoryBars = memo(function CategoryBars({
  data,
}: {
  data: Array<{ name: string; amount: number; color: string }>
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No category spend
      </p>
    )
  }

  const chartData = data.slice(0, 8)

  return (
    <ClientChart fill minHeight={224}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e0d8" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-IN", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(Number(v))
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          width={88}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatINR(Number(value ?? 0))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ClientChart>
  )
})
