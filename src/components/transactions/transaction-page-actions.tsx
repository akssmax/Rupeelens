import {
  FileDown,
  Loader2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react"
import { MonthSelect } from "@/components/month-select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadTransactionsCsv } from "@/lib/export-transactions"
import type { Category, Transaction } from "@/lib/types"

export function TransactionPageActions({
  months,
  month,
  onMonthChange,
  uncategorizedCount,
  running,
  onAutoCategorize,
  exportRows,
  categories,
  exportTitle,
  exportFilename,
}: {
  months: string[]
  month: string
  onMonthChange: (month: string) => void
  uncategorizedCount: number
  running: boolean
  onAutoCategorize: (force?: boolean) => void
  exportRows: Transaction[]
  categories: Category[]
  exportTitle: string
  exportFilename: string
}) {
  const needsCategorize = uncategorizedCount > 0

  const exportCsv = () => {
    downloadTransactionsCsv(exportRows, categories, exportFilename)
  }

  const exportPdf = () => {
    void import("@/lib/export-transactions-pdf").then(({ downloadTransactionsPdf }) => {
      downloadTransactionsPdf(
        exportRows,
        categories,
        exportFilename,
        exportTitle,
      )
    })
  }

  return (
    <>
      <MonthSelect months={months} value={month} onChange={onMonthChange} />
      {needsCategorize ? (
        <Button
          onClick={() => onAutoCategorize(false)}
          disabled={running}
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Auto-categorize
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={running}
              aria-label="Transaction actions"
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              disabled={running}
              onClick={() => onAutoCategorize(true)}
            >
              <Sparkles className="size-4" />
              Re-categorize all
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={exportRows.length === 0}
              onClick={exportCsv}
            >
              <FileDown className="size-4" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportRows.length === 0}
              onClick={exportPdf}
            >
              <FileDown className="size-4" />
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
