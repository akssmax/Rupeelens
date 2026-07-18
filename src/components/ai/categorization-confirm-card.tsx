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
  const applicable = previews.filter((preview) => preview.toUpdate.length > 0)

  if (status === "cancelled" || status === "confirmed") {
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
              {preview.toUpdate.length} transaction
              {preview.toUpdate.length === 1 ? "" : "s"} will update
              {preview.currentCategoryName &&
              preview.currentCategoryName !== preview.categoryName
                ? ` (was: ${preview.currentCategoryName})`
                : ""}
              {preview.alreadyCorrect.length > 0
                ? ` · ${preview.alreadyCorrect.length} already in ${preview.categoryName}`
                : ""}
            </p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              {preview.toUpdate.slice(0, 4).map((tx) => (
                <li key={tx.id}>
                  {tx.date} ·{" "}
                  {tx.debit > 0 ? formatINR(tx.debit) : formatINR(tx.credit)}
                </li>
              ))}
              {preview.toUpdate.length > 4 ? (
                <li>+{preview.toUpdate.length - 4} more</li>
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
