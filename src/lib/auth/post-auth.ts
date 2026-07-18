import { authClient } from "./client"

const FORCE_FETCH_HEADER = "X-Force-Fetch"

/** Refresh session from Neon Auth and ensure JWT is available for server functions. */
export async function ensureAuthSessionReady() {
  const session = await authClient.getSession({
    query: { disableCookieCache: true },
    fetchOptions: {
      headers: { [FORCE_FETCH_HEADER]: "true" },
    },
  })

  if (session.error) {
    throw new Error(session.error.message ?? "Could not start session")
  }
  if (!session.data?.user) {
    throw new Error("Sign in failed — no session returned")
  }

  return session.data
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message) return message
  }
  return fallback
}
