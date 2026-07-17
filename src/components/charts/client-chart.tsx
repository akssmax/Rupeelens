import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { cn } from "@/lib/utils"

type Size = { width: number; height: number }

/**
 * Measure the host and pass explicit numeric width/height to Recharts.
 * Avoids ResponsiveContainer's -1 size warn loop (crashes Vite via console bridge).
 */
export function ClientChart({
  className,
  children,
  minHeight = 200,
}: {
  className?: string
  children: ReactElement<{ width?: number; height?: number }>
  minHeight?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      )
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ready = size.width >= 1 && size.height >= 1

  return (
    <div
      ref={hostRef}
      className={cn("relative w-full min-w-0", className)}
      style={{ height: minHeight, minHeight }}
    >
      {ready && isValidElement(children) ? (
        <ErrorBoundary fallbackTitle="Chart failed to render" compact>
          {cloneElement(children, {
            width: size.width,
            height: size.height,
          })}
        </ErrorBoundary>
      ) : (
        <div className="bg-muted/40 absolute inset-0 animate-pulse rounded-lg" />
      )}
    </div>
  )
}
