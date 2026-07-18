import { createAuthClient } from "@neondatabase/auth"
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters"
import { getAuthUrl } from "./config"

export const authClient = createAuthClient(getAuthUrl(), {
  adapter: BetterAuthReactAdapter(),
})
