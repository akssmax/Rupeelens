import { AiProvider, useAiPanel } from "@/components/ai/ai-context"
import { AiFab, AiSidepanel } from "@/components/ai/ai-sidepanel"
import { ErrorBoundary } from "@/components/error-boundary"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { useShellChrome } from "@/components/layout/shell-chrome"
import { CategorizeJobProvider } from "@/components/upload/categorize-job-provider"
import { CategorizeProgressPopover } from "@/components/upload/categorize-progress-popover"
import { UploadModal } from "@/components/upload/upload-modal"
import { FinanceProvider, useFinanceData } from "@/hooks/use-finance-data"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <FinanceProvider>
      <AiProvider>
        <CategorizeJobProvider>
          <AppShellChrome>{children}</AppShellChrome>
        </CategorizeJobProvider>
      </AiProvider>
    </FinanceProvider>
  )
}

function AppShellChrome({ children }: { children: React.ReactNode }) {
  const { open, setOpen, openAi } = useAiPanel()
  const { minimal: minimalShell } = useShellChrome()
  const { isSignedIn, hasLocalData, transactions } = useFinanceData()

  // Hide sidebar on first visit / empty IndexedDB before onboarding mounts.
  const welcomeChrome =
    !isSignedIn &&
    transactions.length === 0 &&
    hasLocalData !== true
  const minimal = minimalShell || welcomeChrome

  if (minimal) {
    return (
      <div className="bg-background min-h-svh">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
          <ErrorBoundary fallbackTitle="This page crashed">
            {children}
          </ErrorBoundary>
        </div>
        <AiSidepanel open={open} onOpenChange={setOpen} />
        <UploadModal />
        <CategorizeProgressPopover />
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen className="bg-background">
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <SidebarTrigger className="bg-background/90 fixed top-3 left-3 z-30 border shadow-sm md:hidden" />
        <main className="flex min-h-0 flex-1 flex-col px-3 py-4 pt-14 sm:px-4 md:px-6 md:py-6 md:pt-6 lg:px-8">
          <ErrorBoundary fallbackTitle="This page crashed">
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </ErrorBoundary>
        </main>
      </SidebarInset>

      <AiFab onClick={openAi} />
      <AiSidepanel open={open} onOpenChange={setOpen} />
      <UploadModal />
      <CategorizeProgressPopover />
    </SidebarProvider>
  )
}
