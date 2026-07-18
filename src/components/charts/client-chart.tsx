import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Size = { width: number; height: number }

function ChartSkeleton({
  className,
  minHeight,
  fill,
}: {
  className?: string
  minHeight: number
  fill?: boolean
}) {
  return (
    <div
      className={cn("relative w-full min-w-0", fill && "h-full", className)}
      style={fill ? { minHeight } : { height: minHeight, minHeight }}
    >
      <Skeleton className="absolute inset-0 rounded-lg" />
    </div>
  )
}

/**
 * Measure the host and pass explicit numeric width/height to Recharts.
 * Client-only mount avoids SSR hydration mismatches and Recharts -1 size loops.
 */
export function ClientChart({
  className,
  children,
  minHeight = 200,
  fill = false,
}: {
  className?: string
  children: ReactElement<{ width?: number; height?: number }>
  minHeight?: number
  /** When true, grow to fill the parent height (parent must define height). */
  fill?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
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
  }, [mounted])

  if (!mounted) {
    return (
      <ChartSkeleton className={className} minHeight={minHeight} fill={fill} />
    )
  }

  const ready = size.width >= 1 && size.height >= 1

  return (
    <div
      ref={hostRef}
      className={cn("relative w-full min-w-0", fill && "h-full", className)}
      style={fill ? { minHeight } : { height: minHeight, minHeight }}
    >
      {ready && isValidElement(children) ? (
        <ErrorBoundary fallbackTitle="Chart failed to render" compact>
          {cloneElement(children, {
            width: size.width,
            height: size.height,
          })}
        </ErrorBoundary>
      ) : (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
    </div>
  )
}
