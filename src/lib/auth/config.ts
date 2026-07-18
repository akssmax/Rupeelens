const AUTH_URL =
  (typeof process !== "undefined" ? process.env.VITE_NEON_AUTH_URL : undefined) ??
  import.meta.env.VITE_NEON_AUTH_URL

export function getAuthUrl(): string {
  if (!AUTH_URL) {
    throw new Error("VITE_NEON_AUTH_URL is not configured")
  }
  return AUTH_URL
}

/** JWT iss/aud claim base (Neon Auth host, without /neondb/auth path). */
export function getNeonAuthIssuer(): string {
  return new URL(getAuthUrl()).origin
}

export function getNeonAuthJwksUrl(): string {
  return `${getAuthUrl()}/.well-known/jwks.json`
}

export function getDatabaseUrl(): string {
  const url =
    typeof process !== "undefined" ? process.env.DATABASE_URL : undefined
  if (!url) {
    throw new Error("DATABASE_URL is not configured")
  }
  return url
}
