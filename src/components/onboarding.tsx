import { motion } from "framer-motion"
import {
  FileSpreadsheet,
  Sparkles,
  Tags,
  Upload,
} from "lucide-react"
import { useMinimalShell } from "@/components/layout/shell-chrome"
import { useUploadPanel } from "@/components/upload/upload-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const steps = [
  {
    icon: FileSpreadsheet,
    title: "Export CSV from your bank",
    body: "Axis, HDFC, ICICI, SBI and more — download the monthly statement CSV from netbanking or the app.",
  },
  {
    icon: Upload,
    title: "Import in one drop",
    body: "We detect the bank, fix debit/credit quirks, and keep everything in your browser.",
  },
  {
    icon: Tags,
    title: "Auto-categorize",
    body: "Rules catch Blinkit, Swiggy, Netflix and friends; Mistral labels the rest.",
  },
]

export function Onboarding() {
  useMinimalShell(true)
  const { openUpload } = useUploadPanel()

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 text-center"
      >
        <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-2xl text-lg font-semibold">
          ₹
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Welcome to RupeeLens
        </h1>
        <p className="text-muted-foreground mx-auto max-w-lg text-sm leading-relaxed">
          Your personal finance view from bank CSVs — private by default, with
          AI that understands Indian UPI narrations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button size="lg" onClick={openUpload}>
            <Upload className="size-4" />
            Upload your first statement
          </Button>
        </div>
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
          <Sparkles className="size-3.5" />
          AI categorization runs automatically after import
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * (i + 1) }}
            >
              <Card className="h-full">
                <CardContent className="space-y-2 pt-5">
                  <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                    <Icon className="text-foreground size-4" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Step {i + 1}
                  </p>
                  <h2 className="font-heading text-sm font-semibold">
                    {step.title}
                  </h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Tip: statements stay on this device. Only short narration snippets are
        sent when you categorize with AI.
      </p>
    </div>
  )
}
