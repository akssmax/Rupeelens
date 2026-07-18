import { CsvUploader } from "@/components/upload/csv-uploader"
import { useUploadPanel } from "@/components/upload/upload-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function UploadModal() {
  const { open, setOpen } = useUploadPanel()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="flex h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <CsvUploader
          onComplete={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        >
          {({ body, footer }) => (
            <>
              <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
                <DialogTitle>Upload statement</DialogTitle>
                <DialogDescription>
                  Import a monthly statement (CSV, Excel, or PDF) from your bank.
                  Data stays in your browser; only narrations go to Mistral for
                  categorization.
                </DialogDescription>
              </DialogHeader>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-4">
                {body}
              </div>

              <div
                data-slot="dialog-footer"
                className="shrink-0 border-t bg-muted/40 px-6 py-3"
              >
                {footer}
              </div>
            </>
          )}
        </CsvUploader>
      </DialogContent>
    </Dialog>
  )
}
