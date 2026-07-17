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

export type CategoryId =
  | "food"
  | "groceries"
  | "transport"
  | "shopping"
  | "rent"
  | "utilities"
  | "entertainment"
  | "health"
  | "travel"
  | "transfers"
  | "salary"
  | "investments"
  | "subscriptions"
  | "fees"
  | "cash"
  | "other"
  | "uncategorized"

export interface Category {
  id: CategoryId
  name: string
  color: string
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
  merchant?: string
  isSubscription?: boolean
  confidence?: number
  raw?: Record<string, string>
}

export interface MerchantMemory {
  merchantKey: string
  categoryId: CategoryId
  updatedAt: string
}

export interface AppSettings {
  id: "settings"
  currency: "INR"
  mistralModel: string
  lastImportAt?: string
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
