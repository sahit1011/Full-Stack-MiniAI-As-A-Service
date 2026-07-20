"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PipelineStep = "upload" | "profile" | "train" | "predict"

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "profile", label: "Profile" },
  { key: "train", label: "Train" },
  { key: "predict", label: "Predict" },
]

/**
 * Persistent wayfinding across the linear pipeline (Upload → Profile → Train → Predict).
 * Completed steps link back when we have the id needed to reach them; the current step is
 * highlighted; future steps are muted and inert.
 */
export function PipelineStepper({
  current,
  sessionId,
  modelId,
  className,
}: {
  current: PipelineStep
  sessionId?: string
  modelId?: string
  className?: string
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  const hrefFor = (key: PipelineStep, index: number): string | null => {
    // Only allow navigating to already-completed steps we can actually address
    if (index >= currentIndex) return null
    if (key === "upload") return "/upload"
    if (key === "profile") return sessionId ? `/profile/${sessionId}` : null
    if (key === "train") return sessionId ? `/train/${sessionId}` : null
    if (key === "predict") return modelId ? `/predict/${modelId}` : null
    return null
  }

  return (
    <nav aria-label="Pipeline progress" className={cn("mx-auto max-w-6xl px-6 py-4", className)}>
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo"
          const href = hrefFor(step.key, index)

          const dot = (
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "current" && "border-primary text-primary",
                state === "todo" && "border-border text-muted-foreground"
              )}
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
          )

          const label = (
            <span
              className={cn(
                "font-medium",
                state === "current" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          )

          return (
            <li key={step.key} className="flex items-center gap-2">
              {href ? (
                <Link href={href} className="flex items-center gap-2 transition-opacity hover:opacity-80">
                  {dot}
                  {label}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  {dot}
                  {label}
                </div>
              )}
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-1 h-px w-6 sm:w-10",
                    index < currentIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default PipelineStepper
