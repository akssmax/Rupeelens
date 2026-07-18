import { createFileRoute } from "@tanstack/react-router"
import { useMinimalShell } from "@/components/layout/shell-chrome"
import { SignupForm } from "@/components/signup-form"

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})

function SignupPage() {
  useMinimalShell()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-10">
      <SignupForm className="w-full" />
    </main>
  )
}
