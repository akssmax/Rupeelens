import {
  FileDown,
  Group,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react"
import { MonthSelect } from "@/components/month-select"
import { Button } from "@/components/ui/button"
import { IconButtonTooltip } from "@/components/ui/icon-button-tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadTransactionsCsv } from "@/lib/export-transactions"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  TRANSACTION_GROUP_OPTIONS,
  type TransactionGroupBy,
} from "@/components/transactions/transaction-table"

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
  filtersOpen,
  onFiltersOpenChange,
  activeFilterCount = 0,
  groupBy = "none",
  onGroupByChange,
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
  filtersOpen?: boolean
  onFiltersOpenChange?: (open: boolean) => void
  activeFilterCount?: number
  groupBy?: TransactionGroupBy
  onGroupByChange?: (groupBy: TransactionGroupBy) => void
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

  const filtersActive = Boolean(filtersOpen || activeFilterCount > 0)
  const groupingActive = groupBy !== "none"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MonthSelect months={months} value={month} onChange={onMonthChange} />
      {onFiltersOpenChange ? (
        <IconButtonTooltip
          label={filtersOpen ? "Hide filters" : "Show filters"}
        >
          <Button
            variant={filtersOpen ? "secondary" : "outline"}
            size="icon-sm"
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
            aria-pressed={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
            className={cn("relative", filtersActive && "border-primary")}
          >
            <ListFilter className="size-4" />
            {activeFilterCount > 0 ? (
              <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </IconButtonTooltip>
      ) : null}
      {onGroupByChange ? (
        <DropdownMenu>
          <IconButtonTooltip label="Group transactions">
            <DropdownMenuTrigger asChild>
              <Button
                variant={groupingActive ? "secondary" : "outline"}
                size="icon-sm"
                aria-label="Group transactions"
                aria-pressed={groupingActive}
                className={cn(groupingActive && "border-primary")}
              >
                <Group className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </IconButtonTooltip>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={groupBy}
              onValueChange={(value) =>
                onGroupByChange(value as TransactionGroupBy)
              }
            >
              {TRANSACTION_GROUP_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
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
          <IconButtonTooltip label="Transaction actions">
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
          </IconButtonTooltip>
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
    </div>
  )
}
