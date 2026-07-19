import "@/lib/dev-console-guard"
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary"
import { AppShell } from "@/components/layout/app-shell"
import { AppProviders } from "@/components/providers"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "RupeeLens — Personal Finance",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <AppShell>
      <main className="py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold">404</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested page could not be found.
        </p>
      </main>
    </AppShell>
  ),
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <ErrorFallback
        title="Something went wrong"
        error={error}
        onRetry={reset}
      />
    </AppShell>
  ),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <ErrorBoundary fallbackTitle="App failed to load">
      <AppShell>
        <Outlet />
      </AppShell>
    </ErrorBoundary>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>
          {children}
          {import.meta.env.DEV ? (
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          ) : null}
        </AppProviders>
        <Scripts />
      </body>
    </html>
  )
}
