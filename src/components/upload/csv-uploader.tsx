import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import {
  readStatementAsCsvText,
  STATEMENT_FILE_ACCEPT,
  statementKindLabel,
  type StatementFileKind,
} from "@/lib/statement-files"
import {
  detectBankFromFile,
  listCsvHeaders,
  parseBankCsv,
} from "@/lib/banks"
import { bankLabel, formatDisplayDate, formatINR } from "@/lib/format"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { importCsvFile } from "@/lib/import"
import type { BankId, ColumnMapping, ParseResult } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useCategorizeJob } from "@/components/upload/categorize-job-context"

const BANKS: BankId[] = [
  "axis",
  "hdfc",
  "icici",
  "sbi",
  "kotak",
  "yes",
  "indusind",
  "idfc",
  "generic",
]

type CsvUploaderRenderProps = {
  body: ReactNode
  footer: ReactNode
  busy: boolean
  hasFile: boolean
  canImport: boolean
}

export function CsvUploader({
  onComplete,
  onCancel,
  children,
}: {
  onComplete?: () => void
  onCancel?: () => void
  children?: (slots: CsvUploaderRenderProps) => ReactNode
}) {
  const navigate = useNavigate()
  const { startJob } = useCategorizeJob()
  const [dragOver, setDragOver] = useState(false)
  const [filename, setFilename] = useState("")
  const [text, setText] = useState("")
  const [bank, setBank] = useState<BankId>("axis")
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [showMapper, setShowMapper] = useState(false)
  const [importing, setImporting] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [sourceKind, setSourceKind] = useState<StatementFileKind | null>(null)

  const busy = importing || loadingFile
  const canImport = Boolean(preview && preview.rows.length > 0) && !busy

  const applyParse = useCallback(
    (csvText: string, name: string, bankId: BankId, map?: ColumnMapping) => {
      const result = parseBankCsv({
        text: csvText,
        filename: name,
        bankOverride: bankId,
        mapping: map,
      })
      setPreview(result)
      setShowMapper(result.rows.length === 0)
      return result
    },
    [],
  )

  const loadFile = useCallback(
    async (file: File) => {
      setLoadingFile(true)
      try {
        const { text: csvText, kind } = await readStatementAsCsvText(file)
        setFilename(file.name)
        setText(csvText)
        setSourceKind(kind)
        const detected = detectBankFromFile(csvText, file.name)
        setBank(detected)
        const parsed = Papa.parse<string[]>(csvText, {
          header: false,
          skipEmptyLines: "greedy",
        })
        const matrix = (parsed.data as string[][]).map((row) =>
          row.map((c) => (c == null ? "" : String(c))),
        )
        setHeaders(listCsvHeaders(matrix))
        const result = applyParse(csvText, file.name, detected)
        if (kind !== "csv") {
          toast.success(
            `${statementKindLabel(kind)} converted — review the preview before importing`,
          )
        }
        if (result.rows.length === 0 && kind === "pdf") {
          toast.message("PDF parsed with limited structure", {
            description:
              "Try Map columns, or export CSV/Excel from your bank for best results.",
          })
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not read file")
        setFilename("")
        setText("")
        setPreview(null)
        setHeaders([])
        setMapping({})
        setShowMapper(false)
        setSourceKind(null)
      } finally {
        setLoadingFile(false)
      }
    },
    [applyParse],
  )

  const clearFile = () => {
    if (busy) return
    setFilename("")
    setText("")
    setPreview(null)
    setHeaders([])
    setMapping({})
    setShowMapper(false)
    setSourceKind(null)
  }

  const previewRows = useMemo(
    () => preview?.rows.slice(0, 10) ?? [],
    [preview],
  )

  const onBankChange = (value: string) => {
    const b = value as BankId
    setBank(b)
    if (text) applyParse(text, filename, b)
  }

  const applyMapping = () => {
    if (!mapping.date || !mapping.description) {
      toast.error("Date and Description columns are required")
      return
    }
    if (!mapping.debit && !mapping.credit && !mapping.amount) {
      toast.error("Provide Debit/Credit or Amount column")
      return
    }
    const full = mapping as ColumnMapping
    applyParse(text, filename, bank, full)
    setShowMapper(false)
    toast.success("Columns mapped")
  }

  const confirmImport = async () => {
    if (!text || !preview || preview.rows.length === 0) {
      toast.error("Nothing to import")
      return
    }
    setImporting(true)
    try {
      const fullMapping =
        showMapper || mapping.date ? (mapping as ColumnMapping) : undefined
      const result = await importCsvFile({
        text,
        filename,
        bankOverride: bank,
        mapping:
          fullMapping?.date && fullMapping?.description
            ? fullMapping
            : undefined,
      })

      const importSummary =
        `Imported ${result.transactions.length} transaction${result.transactions.length === 1 ? "" : "s"}` +
        (result.skippedDuplicates
          ? ` (${result.skippedDuplicates} duplicates skipped)`
          : "")

      emitFinanceRefresh()
      onComplete?.()
      void navigate({ to: "/" })

      if (result.transactions.length > 0) {
        const toastId = "statement-import"
        toast.loading(`${importSummary}. Categorizing…`, { id: toastId })
        void startJob(result.transactions, {
          label: `Categorizing ${filename || "statement"}`,
          toastId,
          importSummary,
        })
      } else {
        toast.success(importSummary, { id: "statement-import" })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }

  const body = (
    <div
      className={cn(
        "flex flex-col",
        text ? "space-y-5" : "min-h-full gap-5",
      )}
    >
      <div
        className={cn(
          "border-border/80 bg-background/70 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 transition-colors",
          text ? "py-10" : "min-h-48 flex-1 py-10",
          dragOver && "border-primary bg-primary/5",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void loadFile(file)
        }}
      >
        {loadingFile ? (
          <Loader2 className="text-muted-foreground mb-3 size-9 animate-spin" />
        ) : (
          <FileSpreadsheet className="text-muted-foreground mb-3 size-9" />
        )}
        <p className="font-heading text-sm font-semibold">
          Drop your bank statement here
        </p>
        <p className="text-muted-foreground mt-1 text-center text-xs">
          CSV, Excel (.xls/.xlsx), or PDF — most Indian bank statements
        </p>
        <label className="mt-4">
          <input
            type="file"
            accept={STATEMENT_FILE_ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void loadFile(file)
              e.target.value = ""
            }}
          />
          <Button asChild variant="outline" size="sm" disabled={busy}>
            <span>Choose file</span>
          </Button>
        </label>
        {filename ? (
          <p className="text-muted-foreground mt-3 max-w-full truncate px-2 text-xs">
            {filename}
            {sourceKind && sourceKind !== "csv"
              ? ` · ${statementKindLabel(sourceKind)}`
              : ""}
          </p>
        ) : null}
      </div>

      {text ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Import preview</p>
              <p className="text-muted-foreground text-xs">
                First 10 rows · check debit/credit look right
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground text-xs">Bank</Label>
              <Select value={bank} onValueChange={onBankChange} disabled={busy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {bankLabel(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-muted rounded-md px-2 py-1">
              Detected: {bankLabel(preview?.bank ?? bank)}
            </span>
            <span className="bg-muted rounded-md px-2 py-1">
              {preview?.rows.length ?? 0} transactions
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              disabled={busy}
              onClick={() => setShowMapper((v) => !v)}
            >
              {showMapper ? "Hide mapper" : "Map columns"}
            </Button>
          </div>

          {preview?.warnings?.length ? (
            <p className="text-amber-700 text-xs">
              {preview.warnings.join(" · ")}
            </p>
          ) : null}

          {showMapper ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["date", "Date *"],
                  ["description", "Description *"],
                  ["debit", "Debit"],
                  ["credit", "Credit"],
                  ["amount", "Amount (signed)"],
                  ["balance", "Balance"],
                  ["valueDate", "Value date"],
                  ["bankRef", "Reference"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Select
                    value={mapping[key] ?? ""}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [key]: v || undefined }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button size="sm" onClick={applyMapping}>
                  Apply mapping
                </Button>
              </div>
            </div>
          ) : null}

          {previewRows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r, i) => (
                    <TableRow key={`${r.date}-${i}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDisplayDate(r.date)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs">
                        {r.description}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.debit ? formatINR(r.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.credit ? formatINR(r.credit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No rows parsed. Try Map columns or another bank preset.
            </p>
          )}

          {importing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Saving transactions…
              </div>
              <Progress value={30} />
            </motion.div>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground shrink-0 space-y-2 text-xs">
          <p className="font-medium text-foreground">How to export</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Open your bank app or netbanking</li>
            <li>Download your monthly statement as CSV, Excel, or PDF</li>
            <li>Drop it above — we parse and detect the format automatically</li>
          </ol>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground text-xs">
        {filename
          ? `${preview?.rows.length ?? 0} rows ready`
          : "No file selected"}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        {text ? (
          <Button variant="ghost" onClick={clearFile} disabled={busy}>
            Clear
          </Button>
        ) : null}
        <Button
          onClick={() => void confirmImport()}
          disabled={!canImport}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Working…
            </>
          ) : (
            "Confirm import"
          )}
        </Button>
      </div>
    </div>
  )

  if (children) {
    return (
      <>
        {children({
          body,
          footer,
          busy,
          hasFile: Boolean(text),
          canImport,
        })}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {body}
      <div className="border-t pt-4">{footer}</div>
    </div>
  )
}
