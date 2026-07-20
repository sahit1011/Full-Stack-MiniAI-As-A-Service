"use client"

import Link from "next/link"
import { AlertTriangle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ErrorStateAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "outline" | "secondary" | "ghost"
}

/**
 * One shared error surface for pipeline pages — replaces the per-page bespoke
 * "centered warning icon" blocks. Always offer a recovery path and (optionally) a retry.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  actions = [],
}: {
  title?: string
  message?: string
  onRetry?: () => void
  actions?: ErrorStateAction[]
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RotateCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        )}
        {actions.map((action) =>
          action.href ? (
            <Button key={action.label} asChild variant={action.variant ?? "default"}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button key={action.label} onClick={action.onClick} variant={action.variant ?? "default"}>
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

export default ErrorState
