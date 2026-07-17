import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  children: ReactNode
  fallbackTitle?: string
  /** Smaller fallback for embedded widgets (charts, panels) */
  compact?: boolean
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  private loggedKey: string | null = null

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log once with a short message — full Error objects get mirrored by Vite's
    // client↔server console bridge and can flood / crash the dev server.
    const key = `${error.name}:${error.message}`
    if (this.loggedKey === key) return
    this.loggedKey = key
    console.warn(
      `[RupeeLens] ${key}`,
      info.componentStack?.split("\n").slice(0, 4).join("\n"),
    )
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.compact) {
        return (
          <div className="text-muted-foreground flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 px-4 text-center text-sm">
            <p>{this.props.fallbackTitle ?? "Could not render chart"}</p>
            <Button size="sm" variant="outline" onClick={this.reset}>
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          </div>
        )
      }
      return (
        <ErrorFallback
          title={this.props.fallbackTitle}
          error={this.state.error}
          onRetry={this.reset}
        />
      )
    }
    return this.props.children
  }
}

export function ErrorFallback({
  title = "Something went wrong",
  error,
  onRetry,
}: {
  title?: string
  error?: Error
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-5" />
      </div>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {error?.message ||
            "An unexpected error occurred. You can try again or reload the page."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/"
          }}
        >
          Go home
        </Button>
      </div>
    </div>
  )
}
