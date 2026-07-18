import { memo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ClientChart } from "@/components/charts/client-chart"
import { CashflowChartTooltip } from "@/components/charts/chart-tooltip"

const INCOME = "#2a9d8f"
const EXPENSE = "#e76f51"

export const CashflowChart = memo(function CashflowChart({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number }>
}) {
  const navigate = useNavigate()

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No cashflow data
      </p>
    )
  }

  return (
    <ClientChart fill minHeight={224}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barGap={4}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e0d8" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          width={44}
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
        <Tooltip content={<CashflowChartTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={28}
          formatter={(value) => (value === "income" ? "Income" : "Expense")}
        />
        <Bar
          dataKey="income"
          name="income"
          fill={INCOME}
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          cursor="pointer"
          className="transition-opacity hover:opacity-80"
          onClick={() => {
            void navigate({ to: "/credits-debits", search: { tab: "credits" } })
          }}
        />
        <Bar
          dataKey="expense"
          name="expense"
          fill={EXPENSE}
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          cursor="pointer"
          className="transition-opacity hover:opacity-80"
          onClick={() => {
            void navigate({ to: "/credits-debits", search: { tab: "debits" } })
          }}
        />
      </BarChart>
    </ClientChart>
  )
})
