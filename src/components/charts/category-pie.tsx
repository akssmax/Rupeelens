import { memo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { CategoryChartTooltip } from "@/components/charts/chart-tooltip"
import type { CategoryChartDatum } from "@/lib/chart-types"

export const CategoryPie = memo(function CategoryPie({
  data,
}: {
  data: CategoryChartDatum[]
}) {
  const navigate = useNavigate()

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No expenses this month
      </p>
    )
  }

  const openCategory = (entry: CategoryChartDatum) => {
    void navigate({
      to: "/transactions",
      search: { category: entry.categoryId },
    })
  }

  return (
    <ClientChart fill className="mx-auto w-full max-w-sm" minHeight={200}>
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
          cursor="pointer"
          onClick={(data) => {
            const payload =
              (data as { payload?: CategoryChartDatum }).payload ??
              (data as unknown as CategoryChartDatum)
            if (payload.categoryId) openCategory(payload)
          }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.color}
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </Pie>
        <Tooltip content={<CategoryChartTooltip />} />
      </PieChart>
    </ClientChart>
  )
})
