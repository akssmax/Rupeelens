import { memo } from "react"
import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { formatINR } from "@/lib/format"

export const CategoryPie = memo(function CategoryPie({
  data,
}: {
  data: Array<{ name: string; amount: number; color: string }>
}) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No expenses this month
      </p>
    )
  }

  return (
    <ClientChart className="mx-auto h-56 max-w-sm" minHeight={224}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatINR(Number(value ?? 0))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        />
      </PieChart>
    </ClientChart>
  )
})
