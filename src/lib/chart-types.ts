import type { CategoryId } from "./types"

export type CategoryChartDatum = {
  name: string
  amount: number
  color: string
  categoryId: CategoryId
}

export type SpendChartDatum = {
  label: string
  amount: number
  date?: string
  weekKey?: string
}
