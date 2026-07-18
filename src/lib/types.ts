export type BankId =
  | "axis"
  | "hdfc"
  | "icici"
  | "sbi"
  | "kotak"
  | "yes"
  | "indusind"
  | "idfc"
  | "generic"

/** Built-in seed ids plus user-defined `custom_*` ids. */
export type CategoryId = string

export interface Category {
  id: CategoryId
  name: string
  color: string
  custom?: boolean
}

export interface Statement {
  id: string
  bank: BankId
  accountHint?: string
  periodStart: string
  periodEnd: string
  uploadedAt: string
  filename: string
  rowCount: number
}

export interface Transaction {
  id: string
  statementId: string
  date: string
  valueDate?: string
  description: string
  debit: number
  credit: number
  /** Signed amount: credit positive, debit negative */
  amount: number
  balance?: number
  bankRef?: string
  categoryId: CategoryId
  /** Set to `user` when the category was manually chosen; skipped on re-categorize. */
  categorySource?: "user" | "rules" | "memory" | "llm"
  merchant?: string
  isSubscription?: boolean
  confidence?: number
  raw?: Record<string, string>
}

export interface MerchantMemory {
  merchantKey: string
  categoryId: CategoryId
  updatedAt: string
  /** Display name for fuzzy matching (e.g. "Netflix") */
  merchantName?: string
  isSubscription?: boolean
  source?: "rules" | "memory" | "llm" | "user"
}

export interface AppSettings {
  id: "settings"
  currency: "INR"
  mistralModel: string
  lastImportAt?: string
  customCategories?: Category[]
}

export interface ParsedRow {
  date: string
  valueDate?: string
  description: string
  debit: number
  credit: number
  balance?: number
  bankRef?: string
  raw: Record<string, string>
}

export interface ParseResult {
  bank: BankId
  rows: ParsedRow[]
  warnings: string[]
}

export interface CategorizeInput {
  id: string
  date: string
  description: string
  amount: number
}

export interface CategorizeResult {
  id: string
  merchant: string
  category: CategoryId
  isSubscription: boolean
  confidence: number
}

export interface ColumnMapping {
  date: string
  description: string
  debit?: string
  credit?: string
  amount?: string
  balance?: string
  valueDate?: string
  bankRef?: string
}
