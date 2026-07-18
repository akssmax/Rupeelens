import { useMemo } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Cloud, FileSpreadsheet, HardDrive } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { useUploadPanel } from "@/components/upload/upload-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFinanceData } from "@/hooks/use-finance-data"
import { formatDisplayDate } from "@/lib/format"
import {
  buildStatementLedger,
  formatBankLabel,
  formatStatementPeriod,
  issueLabel,
  summarizeStatementLedger,
} from "@/lib/statements/ledger"

export const Route = createFileRoute("/sources")({ component: SourcesPage })

function SourcesPage() {
  const { openUpload } = useUploadPanel()
  const {
    loading,
    statements,
    transactions,
    transactionCount,
    isSignedIn,
    hasLocalData,
  } = useFinanceData()

  const rows = useMemo(
    () => buildStatementLedger(statements, transactions),
    [statements, transactions],
  )
  const summary = useMemo(
    () => summarizeStatementLedger(rows, transactionCount),
    [rows, transactionCount],
  )
  const statementsById = useMemo(
    () => new Map(statements.map((statement) => [statement.id, statement])),
    [statements],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-muted h-32 animate-pulse rounded-xl" />
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (statements.length === 0) {
    return (
      <EmptyState
        title="No statement sources yet"
        description="Upload a bank CSV or XLS to track where your transactions come from."
      />
    )
  }

  const hasIssues =
    summary.duplicateFilenameGroups > 0 ||
    summary.overlappingPairs > 0 ||
    summary.rowCountMismatches > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Sources
          </h1>
          <p className="text-muted-foreground text-sm">
            Uploaded statements and how they map to your transaction data
          </p>
        </div>
        <Button variant="outline" onClick={openUpload}>
          Upload statement
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">Sources</p>
            <p className="mt-1 text-xl font-semibold">{summary.sourceCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">
              Transactions
            </p>
            <p className="mt-1 text-xl font-semibold">
              {summary.transactionCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-muted-foreground text-xs uppercase">Storage</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              {isSignedIn && hasLocalData !== true ? (
                <>
                  <Cloud className="text-primary size-4" />
                  Cloud account
                </>
              ) : isSignedIn ? (
                <>
                  <Cloud className="text-muted-foreground size-4" />
                  Cloud + local pending
                </>
              ) : (
                <>
                  <HardDrive className="text-muted-foreground size-4" />
                  This browser
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasIssues ? (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-xl border px-4 py-3">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Review your sources</p>
            <p className="text-muted-foreground">
              {summary.duplicateFilenameGroups > 0
                ? `${summary.duplicateFilenameGroups} upload${summary.duplicateFilenameGroups === 1 ? "" : "s"} share a filename with another source. `
                : ""}
              {summary.overlappingPairs > 0
                ? `${summary.overlappingPairs} overlapping date range${summary.overlappingPairs === 1 ? "" : "s"} detected. `
                : ""}
              {summary.rowCountMismatches > 0
                ? `${summary.rowCountMismatches} source${summary.rowCountMismatches === 1 ? "" : "s"} have a row count mismatch. `
                : ""}
              Re-uploading the same statement can inflate totals until duplicates are removed.
            </p>
          </div>
        </div>
      ) : (
        <div className="border-border/70 bg-muted/20 rounded-xl border px-4 py-3 text-sm">
          All sources look healthy — row counts match stored transactions and no duplicate filenames were found.
        </div>
      )}

      <div className="border-border/70 overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Statement period</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.statement.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <FileSpreadsheet className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {row.statement.filename}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatBankLabel(row.statement.bank)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatStatementPeriod(row.statement)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDisplayDate(row.statement.uploadedAt.slice(0, 10))}
                  <span className="text-muted-foreground block text-xs">
                    {new Date(row.statement.uploadedAt).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className="font-medium">{row.actualCount}</span>
                  {row.statement.rowCount !== row.actualCount ? (
                    <span className="text-muted-foreground block text-xs">
                      expected {row.statement.rowCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground block text-xs">
                      stored
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.issues.length === 0 ? (
                    <Badge variant="outline">OK</Badge>
                  ) : (
                    <div className="flex max-w-xs flex-col gap-1">
                      {row.issues.map((issue, index) => (
                        <Badge
                          key={`${row.statement.id}-${issue.kind}-${index}`}
                          variant="destructive"
                          className="h-auto min-h-5 whitespace-normal py-1 text-left"
                        >
                          {issueLabel(issue, statementsById)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
