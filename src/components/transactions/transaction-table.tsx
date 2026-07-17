import { memo, useEffect, useState } from "react"
import { MerchantAvatar } from "@/components/merchant-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CATEGORY_MAP } from "@/lib/categories"
import { formatDisplayDate, formatINR } from "@/lib/format"
import type { Category, CategoryId, Transaction } from "@/lib/types"

const PAGE_SIZE = 80

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
}: {
  transactions: Transaction[]
  categories: Category[]
  onCategoryChange?: (id: string, categoryId: CategoryId) => void
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No matching transactions
      </p>
    )
  }

  const shown = transactions.slice(0, visible)
  const remaining = transactions.length - shown.length

  return (
    <div className="space-y-3">
      <div className="border-border/70 overflow-hidden rounded-xl border bg-background/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
                onCategoryChange={onCategoryChange}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {remaining > 0 ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
          >
            Show more ({remaining} remaining)
          </Button>
        </div>
      ) : null}
    </div>
  )
}

const TransactionRow = memo(function TransactionRow({
  transaction: t,
  categories,
  onCategoryChange,
}: {
  transaction: Transaction
  categories: Category[]
  onCategoryChange?: (id: string, categoryId: CategoryId) => void
}) {
  const title = t.merchant || t.description
  const amount = t.credit > 0 ? t.credit : -t.debit

  return (
    <TableRow>
      <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
        {formatDisplayDate(t.date)}
      </TableCell>
      <TableCell>
        <div className="flex max-w-md items-center gap-3">
          <MerchantAvatar
            merchant={t.merchant}
            description={t.description}
            categoryId={t.categoryId}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            {t.merchant ? (
              <p className="text-muted-foreground truncate text-xs">
                {t.description}
              </p>
            ) : null}
            {t.isSubscription ? (
              <Badge variant="secondary" className="mt-1">
                Subscription
              </Badge>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {onCategoryChange ? (
          <Select
            value={t.categoryId}
            onValueChange={(v) => onCategoryChange(t.id, v as CategoryId)}
          >
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">
            {CATEGORY_MAP[t.categoryId]?.name ?? t.categoryId}
          </Badge>
        )}
      </TableCell>
      <TableCell
        className={
          amount >= 0
            ? "text-right font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
            : "text-right font-medium text-rose-600 tabular-nums dark:text-rose-400"
        }
      >
        {formatINR(amount)}
      </TableCell>
    </TableRow>
  )
})
