/**
 * Dev-only guard against Vite's client↔server console mirror feedback loop.
 * A single hydration warning or Recharts error can recurse until the dev server OOMs.
 */
if (import.meta.env.DEV && typeof window !== "undefined") {
  const original = console.error.bind(console)
  const seen = new Set<string>()

  console.error = (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ")

    // Already-mirrored server echo — drop to break the loop.
    if (
      text.includes("[vite]") &&
      (text.includes("[Server]") || text.includes("[console.error]"))
    ) {
      return
    }

    // Hydration mismatch: log once per session, not thousands of times.
    if (
      text.includes("hydration") ||
      text.includes("didn't match the client properties")
    ) {
      const key = "hydration-mismatch"
      if (seen.has(key)) return
      seen.add(key)
    }

    original(...args)
  }
}
