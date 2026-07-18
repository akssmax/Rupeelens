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
import {
  authErrorMessage,
  ensureAuthSessionReady,
} from "@/lib/auth/post-auth"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { migrateIndexedDbToCloud } from "@/lib/migrate-local-to-cloud"
import { cn } from "@/lib/utils"

function syncLocalDataInBackground() {
  void migrateIndexedDbToCloud()
    .then((synced) => {
      emitFinanceRefresh()
      if (synced.transactions > 0) {
        toast.success(
          `Synced ${synced.transactions} local transactions to your account`,
        )
      }
    })
    .catch(() => {
      /* user can retry from sidebar */
    })
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setSubmitting(true)
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0] || "User",
      })
      if (result.error) {
        throw new Error(
          authErrorMessage(result.error, "Could not create account"),
        )
      }

      await ensureAuthSessionReady()
      emitFinanceRefresh()
      toast.success("Account created")
      void navigate({ to: "/" })
      syncLocalDataInBackground()
    } catch (e) {
      toast.error(authErrorMessage(e, "Could not create account"))
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
                <h1 className="font-heading text-2xl font-bold">
                  Create your account
                </h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Sync statements across devices and keep your categories safe.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="name">Username</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Akshay"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <FieldDescription>
                  Used for sign-in and your profile display name.
                </FieldDescription>
              </Field>
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
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link to="/login" className="underline underline-offset-4">
                  Sign in
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
                  Your finance data, synced and private.
                </p>
                <p className="mt-3 max-w-sm text-sm text-white/85">
                  Import locally first, then create an account to upload
                  everything to your Neon-backed profile.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
