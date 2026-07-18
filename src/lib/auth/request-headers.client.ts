import "@tanstack/react-start/client-only"

import { authClient } from "./client"

/** Session token for cloud server functions (Neon Auth cookies are on neonauth.*, not our app domain). */
export async function getAuthRequestHeaders(): Promise<HeadersInit> {
  const result = await authClient.getSession({
    query: { disableCookieCache: true },
    fetchOptions: {
      headers: { "X-Force-Fetch": "true" },
    },
  })
  const token = result.data?.session?.token
  if (!token) {
    throw new Error("Session expired — please sign in again")
  }
  return { Authorization: `Bearer ${token}` }
}
