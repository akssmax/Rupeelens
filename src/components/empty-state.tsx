import { FileUp } from "lucide-react"
import { useUploadPanel } from "@/components/upload/upload-context"
import { Button } from "@/components/ui/button"

/** Compact empty state for secondary pages (not the main onboarding). */
export function EmptyState({
  title = "No transactions yet",
  description = "Upload a monthly bank CSV to see your spending breakdown.",
}: {
  title?: string
  description?: string
}) {
  const { openUpload } = useUploadPanel()

  return (
    <div className="border-border/70 bg-background/60 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <FileUp className="text-muted-foreground size-5" />
      </div>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      <Button className="mt-5" onClick={openUpload}>
        Upload CSV
      </Button>
    </div>
  )
}
