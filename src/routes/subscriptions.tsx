import { createFileRoute } from "@tanstack/react-router"
import { EmptyState } from "@/components/empty-state"
import { MerchantAvatar } from "@/components/merchant-avatar"
import { SubscriptionsPageSkeleton } from "@/components/page-skeletons"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFinanceData } from "@/hooks/use-finance-data"
import { CATEGORY_MAP } from "@/lib/categories"
import { formatDisplayDate, formatINR } from "@/lib/format"

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
})

function SubscriptionsPage() {
  const { loading, transactions, subscriptions } = useFinanceData()

  if (loading) {
    return <SubscriptionsPageSkeleton />
  }

  if (transactions.length === 0) {
    return <EmptyState />
  }

  const monthlyEstimate = subscriptions.reduce((s, g) => s + g.avgAmount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Subscriptions
        </h1>
        <p className="text-muted-foreground text-sm">
          Recurring merchants detected from Mistral flags and amount patterns
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="text-muted-foreground text-xs uppercase">
            Estimated monthly
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatINR(monthlyEstimate)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {subscriptions.length} subscription
            {subscriptions.length === 1 ? "" : "s"} detected
          </p>
        </CardContent>
      </Card>

      {subscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions found"
          description="Recurring merchants appear after you import more months or run auto-categorize. You can also mark subscriptions from Transactions."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recurring debits</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Avg amount</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => (
                  <TableRow key={s.merchant}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <MerchantAvatar
                          merchant={s.merchant}
                          categoryId={s.categoryId}
                        />
                        <span className="font-medium">{s.merchant}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_MAP[s.categoryId]?.name ?? s.categoryId}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDisplayDate(s.lastDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINR(s.avgAmount)}
                    </TableCell>
                    <TableCell className="text-right">{s.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
