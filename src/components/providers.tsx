import { Link, useNavigate } from "@tanstack/react-router"
import { NeonAuthUIProvider } from "@neondatabase/auth-ui"
import { ShellChromeProvider } from "@/components/layout/shell-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { CategorizeJobProvider } from "@/components/upload/categorize-job-context"
import { UploadProvider } from "@/components/upload/upload-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { authClient } from "@/lib/auth/client"

function AuthUiBridge({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={(href) => {
        void navigate({ to: href })
      }}
      Link={({ href, className, children: linkChildren, ...rest }) => (
        <Link to={href} className={className} {...rest}>
          {linkChildren}
        </Link>
      )}
    >
      {children}
    </NeonAuthUIProvider>
  )
}

/** App-wide providers (FinanceProvider + AiProvider live in AppShell). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="rupeelens-theme"
    >
      <TooltipProvider>
        <AuthUiBridge>
          <ShellChromeProvider>
            <CategorizeJobProvider>
              <UploadProvider>{children}</UploadProvider>
            </CategorizeJobProvider>
          </ShellChromeProvider>
        </AuthUiBridge>
      </TooltipProvider>
    </ThemeProvider>
  )
}
