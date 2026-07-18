import { authClient } from "./client"

/** Reactive auth state for UI. Token lives in getSession(), not always in useSession(). */
export function useAuthSession() {
  const session = authClient.useSession()
  const user = session.data?.user

  return {
    user,
    isSignedIn: Boolean(user),
    isPending: session.isPending,
    session,
  }
}
