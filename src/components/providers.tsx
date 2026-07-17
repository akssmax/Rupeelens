import { ShellChromeProvider } from "@/components/layout/shell-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { UploadProvider } from "@/components/upload/upload-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FinanceProvider } from "@/hooks/use-finance-data"

/** App-wide providers (AiProvider lives in AppShell so panel + routes share one tree). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <ShellChromeProvider>
          <FinanceProvider>
            <UploadProvider>{children}</UploadProvider>
          </FinanceProvider>
        </ShellChromeProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
