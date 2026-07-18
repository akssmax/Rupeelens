import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { getDatabaseUrl } from "@/lib/auth/config"
import * as schema from "./schema"

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getPgDb() {
  if (!dbInstance) {
    const sql = neon(getDatabaseUrl())
    dbInstance = drizzle(sql, { schema })
  }
  return dbInstance
}
