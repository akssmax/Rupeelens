import { AnimatePresence, motion } from "framer-motion"
import {
  Brain,
  Check,
  Circle,
  Loader2,
  Sparkles,
  Tags,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useCategorizeJob } from "@/components/upload/categorize-job-context"
import type { CategorizeProgress } from "@/lib/categorize-client"
import { cn } from "@/lib/utils"

type StepId = "rules" | "memory" | "llm" | "done"

const STEPS: Array<{
  id: StepId
  title: string
  description: string
  icon: typeof Tags
}> = [
  {
    id: "rules",
    title: "Known merchants",
    description: "Blinkit, Swiggy, Netflix and catalog matches",
    icon: Tags,
  },
  {
    id: "memory",
    title: "Learned mappings",
    description: "Categories saved from past imports and edits",
    icon: Sparkles,
  },
  {
    id: "llm",
    title: "AI categorization",
    description: "Mistral labels remaining UPI narrations",
    icon: Brain,
  },
  {
    id: "done",
    title: "Complete",
    description: "Your dashboard is ready",
    icon: Check,
  },
]

const PHASE_ORDER: StepId[] = ["rules", "memory", "llm", "done"]

function stepStatus(
  stepId: StepId,
  progress: CategorizeProgress | null,
  active: boolean,
): "pending" | "active" | "done" {
  if (!progress) return active && stepId === "rules" ? "active" : "pending"

  const currentIdx = PHASE_ORDER.indexOf(
    progress.phase === "done" ? "done" : progress.phase,
  )
  const stepIdx = PHASE_ORDER.indexOf(stepId)

  if (stepIdx < currentIdx) return "done"
  if (stepIdx === currentIdx) return active ? "active" : "done"
  return "pending"
}

function overallProgress(
  progress: CategorizeProgress | null,
  active: boolean,
  transactionCount: number,
): number {
  if (!progress || transactionCount === 0) return active ? 8 : 0
  if (progress.phase === "done") return 100

  const phaseWeight = { rules: 0.2, memory: 0.25, llm: 0.55 }
  const phaseIdx = PHASE_ORDER.indexOf(progress.phase)
  let base = 0
  for (let i = 0; i < phaseIdx; i++) {
    const id = PHASE_ORDER[i]!
    if (id !== "done") base += phaseWeight[id as keyof typeof phaseWeight] ?? 0
  }

  const within = progress.total > 0 ? progress.done / progress.total : 1
  const currentWeight =
    progress.phase in phaseWeight
      ? phaseWeight[progress.phase as keyof typeof phaseWeight]
      : 0

  return Math.min(99, Math.round((base + within * currentWeight) * 100))
}

export function CategorizeProgressPopover() {
  const { job, dismiss } = useCategorizeJob()
  const visible =
    !job.dismissed &&
    (job.active || job.result !== null || job.progress?.phase === "done")

  const pct = overallProgress(job.progress, job.active, job.transactionCount)

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="fixed right-4 bottom-4 z-50 w-[min(100vw-2rem,380px)]"
        >
          <div className="border-border/80 bg-background/95 space-y-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-heading text-sm font-semibold">
                  {job.active ? job.label : "Categorization complete"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {job.progress?.label ??
                    `${job.transactionCount} transactions processed`}
                </p>
              </div>
              {!job.active ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={dismiss}
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </Button>
              ) : (
                <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="text-muted-foreground">Overall progress</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>

            <ol className="space-y-2">
              {STEPS.map((step) => {
                const status = stepStatus(step.id, job.progress, job.active)
                const Icon = step.icon
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      status === "active" && "bg-primary/5",
                      status === "done" && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        status === "done" &&
                          "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
                        status === "active" &&
                          "border-primary/30 bg-primary/10 text-primary",
                        status === "pending" &&
                          "border-border text-muted-foreground",
                      )}
                    >
                      {status === "done" ? (
                        <Check className="size-3" />
                      ) : status === "active" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Circle className="size-2.5 fill-current" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon className="size-3.5 shrink-0 opacity-70" />
                        {step.title}
                      </span>
                      <span className="text-muted-foreground block leading-relaxed">
                        {step.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>

            {job.result && !job.active ? (
              <div className="bg-muted/50 text-muted-foreground rounded-lg px-3 py-2 text-xs">
                {job.result.rules} catalog · {job.result.memory} learned ·{" "}
                {job.result.llm} AI
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
