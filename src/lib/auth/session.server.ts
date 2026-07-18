import { getRequestHeader, getRequestHeaders } from "@tanstack/react-start/server"
import { getAuthUrl } from "./config"

export type AuthSessionUser = {
  id: string
  email: string
  name?: string | null
}

export type AuthSession = {
  user: AuthSessionUser
}

type SessionPayload = {
  user?: {
    id?: string
    email?: string
    name?: string | null
  }
} | null

function buildAuthHeaders(): Record<string, string> | null {
  const headers: Record<string, string> = {}
  const authHeader =
    getRequestHeader("authorization") ??
    getRequestHeaders().get("Authorization") ??
    undefined
  const cookie = getRequestHeader("cookie")

  if (authHeader) headers.Authorization = authHeader
  if (cookie) headers.cookie = cookie

  return Object.keys(headers).length > 0 ? headers : null
}

export async function getServerSession(): Promise<AuthSession | null> {
  const headers = buildAuthHeaders()
  if (!headers) return null

  try {
    const res = await fetch(`${getAuthUrl()}/get-session`, { headers })
    if (!res.ok) return null

    const body = (await res.json()) as SessionPayload
    if (!body || typeof body !== "object" || !body.user?.id || !body.user.email) {
      return null
    }

    return {
      user: {
        id: body.user.id,
        email: body.user.email,
        name: body.user.name,
      },
    }
  } catch {
    return null
  }
}

export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}
