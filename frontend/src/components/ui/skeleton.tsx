import { cn } from "@/lib/utils"

/** Quiet shimmer placeholder used while real data loads. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-elevated", className)}
      {...props}
    />
  )
}

export { Skeleton }
