import { useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useUploadPanel } from "@/components/upload/upload-context"

export const Route = createFileRoute("/upload")({ component: UploadRedirect })

/** Legacy /upload URL opens the modal and returns to the dashboard. */
function UploadRedirect() {
  const navigate = useNavigate()
  const { openUpload } = useUploadPanel()

  useEffect(() => {
    openUpload()
    void navigate({ to: "/", replace: true })
  }, [navigate, openUpload])

  return null
}
