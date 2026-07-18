import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const appStatements = pgTable("app_statements", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  bank: text("bank").notNull(),
  accountHint: text("account_hint"),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
  filename: text("filename").notNull(),
  rowCount: numeric("row_count").notNull(),
})

export const appTransactions = pgTable("app_transactions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  statementId: text("statement_id").notNull(),
  date: text("date").notNull(),
  valueDate: text("value_date"),
  description: text("description").notNull(),
  debit: numeric("debit").notNull(),
  credit: numeric("credit").notNull(),
  amount: numeric("amount").notNull(),
  balance: numeric("balance"),
  bankRef: text("bank_ref"),
  categoryId: text("category_id").notNull(),
  merchant: text("merchant"),
  isSubscription: boolean("is_subscription"),
  confidence: numeric("confidence"),
  raw: jsonb("raw"),
})

export const appMerchantMemory = pgTable(
  "app_merchant_memory",
  {
    userId: uuid("user_id").notNull(),
    merchantKey: text("merchant_key").notNull(),
    categoryId: text("category_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    merchantName: text("merchant_name"),
    isSubscription: boolean("is_subscription"),
    source: text("source"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.merchantKey] })],
)

export const appUserSettings = pgTable("app_user_settings", {
  userId: uuid("user_id").primaryKey(),
  currency: text("currency").notNull(),
  mistralModel: text("mistral_model").notNull(),
  lastImportAt: timestamp("last_import_at", { withTimezone: true }),
})
