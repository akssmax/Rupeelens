import { createServerFn } from "@tanstack/react-start"
import { neon } from "@neondatabase/serverless"
import { getDatabaseUrl } from "@/lib/auth/config"

export function looksLikeEmail(value: string): boolean {
  return value.includes("@")
}

/** Resolve a login identifier (email or signup username) to an auth email. */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((data: { identifier: string }) => data)
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim()
    if (!identifier) {
      throw new Error("Enter your email or username")
    }

    if (looksLikeEmail(identifier)) {
      return { email: identifier.toLowerCase() }
    }

    const sql = neon(getDatabaseUrl())
    const rows = (await sql`
      SELECT email
      FROM neon_auth."user"
      WHERE lower(name) = lower(${identifier})
      LIMIT 2
    `) as Array<{ email: string }>

    if (rows.length === 0) {
      throw new Error("No account found with that email or username")
    }
    if (rows.length > 1) {
      throw new Error(
        "Multiple accounts match that username — sign in with your email instead",
      )
    }

    return { email: rows[0]!.email.toLowerCase() }
  })
