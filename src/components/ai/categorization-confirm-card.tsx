import { CheckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatINR } from "@/lib/format"
import type { CategorizationPreview } from "@/lib/chat-categorize"

export function CategorizationConfirmCard({
  previews,
  busy,
  status,
  onConfirm,
  onCancel,
}: {
  previews: CategorizationPreview[]
  busy?: boolean
  status: "pending" | "confirmed" | "cancelled"
  onConfirm: () => void
  onCancel: () => void
}) {
  const applicable = previews.filter((preview) => preview.matched.length > 0)

  if (status === "cancelled") {
    return (
      <p className="text-muted-foreground text-sm">Category update cancelled.</p>
    )
  }

  if (status === "confirmed") {
    return null
  }

  if (applicable.length === 0) {
    return null
  }

  return (
    <div className="border-primary/20 bg-primary/5 mt-3 space-y-3 rounded-lg border p-3">
      <div className="space-y-2">
        {applicable.map((preview) => (
          <div
            key={`${preview.merchantQuery}-${preview.categoryId}`}
            className="space-y-1"
          >
            <p className="text-sm font-medium">
              {preview.merchantQuery} → {preview.categoryName}
            </p>
            <p className="text-muted-foreground text-xs">
              {preview.matched.length} uncategorized transaction
              {preview.matched.length === 1 ? "" : "s"}
            </p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {preview.matched.slice(0, 4).map((tx) => (
                <li key={tx.id}>
                  {tx.date} ·{" "}
                  {tx.debit > 0 ? formatINR(tx.debit) : formatINR(tx.credit)}
                </li>
              ))}
              {preview.matched.length > 4 ? (
                <li>+{preview.matched.length - 4} more</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy} onClick={onConfirm}>
          <CheckIcon className="size-3.5" />
          Confirm update
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onCancel}
        >
          <XIcon className="size-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
