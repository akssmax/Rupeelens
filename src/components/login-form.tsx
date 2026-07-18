import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { migrateIndexedDbToCloud } from "@/lib/migrate-local-to-cloud"
import { cn } from "@/lib/utils"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await authClient.signIn.email({ email, password })
      await authClient.getSession({ query: { disableCookieCache: true } })
      const synced = await migrateIndexedDbToCloud().catch(() => null)
      emitFinanceRefresh()
      if (synced && synced.transactions > 0) {
        toast.success(`Signed in — synced ${synced.transactions} local transactions`)
      } else {
        toast.success("Signed in")
      }
      void navigate({ to: "/" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign in")
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
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
