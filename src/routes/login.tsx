import { createFileRoute } from "@tanstack/react-router"
import { useMinimalShell } from "@/components/layout/shell-chrome"
import { LoginForm } from "@/components/login-form"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  useMinimalShell()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-10">
      <LoginForm className="w-full" />
    </main>
  )
}
