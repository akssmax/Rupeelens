import { format, parseISO, isValid } from "date-fns"

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatINR(amount: number, compact = false): string {
  return (compact ? inrCompact : inr).format(amount)
}

export function formatINRAbs(amount: number): string {
  return formatINR(Math.abs(amount))
}

/** Parse Indian-style amounts: "1,23,456.78", "₹500", "(100.00)" */
export function parseINRAmount(value: unknown): number {
  if (value == null || value === "") return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0

  let s = String(value).trim()
  if (!s || s === "-" || s === "—") return 0

  const negative =
    s.includes("(") || s.startsWith("-") || s.endsWith("Dr") || s.endsWith("DR")
  s = s
    .replace(/₹/g, "")
    .replace(/\bINR\b/gi, "")
    .replace(/\bRs\.?/gi, "")
    .replace(/[()\s]/g, "")
    .replace(/,/g, "")
    .replace(/(Dr|Cr|DR|CR)$/i, "")
    .trim()

  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return negative ? -Math.abs(n) : n
}

/** Parse common Indian bank date formats → ISO yyyy-MM-dd */
export function parseBankDate(value: unknown): string | null {
  if (value == null || value === "") return null
  const s = String(value).trim()
  if (!s) return null

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = parseISO(s.slice(0, 10))
    return isValid(d) ? format(d, "yyyy-MM-dd") : null
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    let year = Number(m[3])
    if (year < 100) year += 2000
    const d = new Date(year, month - 1, day)
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return format(d, "yyyy-MM-dd")
    }
  }

  const fallback = new Date(s)
  return isValid(fallback) ? format(fallback, "yyyy-MM-dd") : null
}

export function formatDisplayDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy")
  } catch {
    return iso
  }
}

export function formatMonthLabel(yyyyMm: string): string {
  try {
    return format(parseISO(`${yyyyMm}-01`), "MMMM yyyy")
  } catch {
    return yyyyMm
  }
}

export function toMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function bankLabel(bank: string): string {
  const labels: Record<string, string> = {
    axis: "Axis Bank",
    hdfc: "HDFC Bank",
    icici: "ICICI Bank",
    sbi: "SBI",
    kotak: "Kotak Mahindra",
    yes: "Yes Bank",
    indusind: "IndusInd Bank",
    idfc: "IDFC First",
    generic: "Generic CSV",
  }
  return labels[bank] ?? bank
}
