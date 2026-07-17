const EVENT = "finance:refresh"

export function emitFinanceRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT))
  }
}

export function onFinanceRefresh(handler: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
