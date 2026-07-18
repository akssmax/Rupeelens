import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { authClient } from "@/lib/auth/client"
import {
  authErrorMessage,
  ensureAuthSessionReady,
} from "@/lib/auth/post-auth"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { migrateIndexedDbToCloud } from "@/lib/migrate-local-to-cloud"
import { cn } from "@/lib/utils"
import { resolveLoginEmail } from "@/server/resolve-login"

function syncLocalDataInBackground() {
  void migrateIndexedDbToCloud()
    .then((synced) => {
      emitFinanceRefresh()
      if (synced.transactions > 0) {
        toast.success(
          `Synced ${synced.transactions} local transactions to your account`,
          { id: "auth" },
        )
      }
    })
    .catch(() => {
      /* user can retry from sidebar */
    })
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [identifierError, setIdentifierError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIdentifierError(null)
    setPasswordError(null)
    setSubmitting(true)
    try {
      const { email } = await resolveLoginEmail({
        data: { identifier: identifier.trim() },
      })
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        throw new Error(
          authErrorMessage(
            result.error,
            "Invalid email, username, or password",
          ),
        )
      }

      await ensureAuthSessionReady()
      emitFinanceRefresh()
      toast.success("Signed in", { id: "auth" })
      void navigate({ to: "/" })
      syncLocalDataInBackground()
    } catch (e) {
      const message = authErrorMessage(e, "Could not sign in")
      if (
        message.toLowerCase().includes("email or username") ||
        message.toLowerCase().includes("no account found") ||
        message.toLowerCase().includes("multiple accounts")
      ) {
        setIdentifierError(message)
      } else {
        setPasswordError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={(e) => void onSubmit(e)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance text-sm">
                  Sign in to load your synced RupeeLens data.
                </p>
              </div>
              <Field data-invalid={identifierError ? true : undefined}>
                <FieldLabel htmlFor="identifier">Email or username</FieldLabel>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or Akshay"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    setIdentifierError(null)
                  }}
                  aria-invalid={!!identifierError}
                  required
                />
                <FieldError>{identifierError}</FieldError>
              </Field>
              <Field data-invalid={passwordError ? true : undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setPasswordError(null)
                    }}
                    aria-invalid={!!passwordError}
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError>{passwordError}</FieldError>
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-primary/10 relative hidden md:block">
            <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
              <div className="from-primary absolute inset-0 bg-linear-to-br to-emerald-700" />
              <div className="relative">
                <p className="text-sm font-medium tracking-wide uppercase opacity-80">
                  RupeeLens
                </p>
                <p className="font-heading mt-2 text-3xl font-semibold text-balance">
                  Pick up where you left off.
                </p>
                <p className="mt-3 max-w-sm text-sm text-white/85">
                  Your statements, categories, and merchant memory load from your
                  cloud account.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
