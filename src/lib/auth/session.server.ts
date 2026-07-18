import { getRequestHeader, getRequestHeaders } from "@tanstack/react-start/server"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { getAuthUrl, getNeonAuthIssuer, getNeonAuthJwksUrl } from "./config"

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

type JwtPayload = {
  sub?: string
  email?: string
  name?: string | null
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(getNeonAuthJwksUrl()))
  }
  return jwks
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3
}

async function getSessionFromBearerJwt(
  token: string,
): Promise<AuthSession | null> {
  if (!looksLikeJwt(token)) return null

  try {
    const issuer = getNeonAuthIssuer()
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: issuer,
    })
    const jwt = payload as JwtPayload
    if (!jwt.sub || !jwt.email) return null

    return {
      user: {
        id: jwt.sub,
        email: jwt.email,
        name: jwt.name,
      },
    }
  } catch {
    return null
  }
}

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

async function getSessionFromCookies(): Promise<AuthSession | null> {
  const headers = buildAuthHeaders()
  if (!headers?.cookie) return null

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

export async function getServerSession(): Promise<AuthSession | null> {
  const authHeader =
    getRequestHeader("authorization") ??
    getRequestHeaders().get("Authorization") ??
    undefined
  const bearer = extractBearerToken(authHeader)

  if (bearer) {
    const jwtSession = await getSessionFromBearerJwt(bearer)
    if (jwtSession) return jwtSession
  }

  return getSessionFromCookies()
}

export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}
