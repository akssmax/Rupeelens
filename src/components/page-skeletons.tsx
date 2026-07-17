import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function PageHeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
    </div>
  )
}

function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className={
        count === 2
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-3"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 pt-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-28" />
            {count === 3 ? null : <Skeleton className="h-3 w-20" />}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartCardSkeleton({ height = "h-56" }: { height?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className={height} />
      </CardContent>
    </Card>
  )
}

function TableRowsSkeleton({
  rows = 8,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="border-border/70 overflow-hidden rounded-xl border bg-background/80">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow key={row}>
              {Array.from({ length: cols }).map((_, col) => (
                <TableCell key={col}>
                  {col === 1 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton
                      className={
                        col === cols - 1 ? "ml-auto h-4 w-16" : "h-4 w-20"
                      }
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border bg-background/70 p-3">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-9 w-[130px]" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton actions={3} />
      <Skeleton className="h-9 w-52" />
      <StatCardsSkeleton count={3} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function TransactionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton actions={2} />
      <FilterBarSkeleton />
      <TableRowsSkeleton rows={10} cols={4} />
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  )
}

export function SpendingPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton actions={1} />
      <StatCardsSkeleton count={2} />
      <Skeleton className="h-9 w-44" />
      <ChartCardSkeleton height="h-72" />
    </div>
  )
}

export function SubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton actions={0} />
      <Card>
        <CardContent className="space-y-2 pt-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
      <TableRowsSkeleton rows={6} cols={5} />
    </div>
  )
}

export function CreditsDebitsPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton actions={1} />
      <StatCardsSkeleton count={2} />
      <Skeleton className="h-9 w-48" />
      <TableRowsSkeleton rows={8} cols={4} />
    </div>
  )
}

export function TrendsInsightsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="size-8 rounded-md" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
