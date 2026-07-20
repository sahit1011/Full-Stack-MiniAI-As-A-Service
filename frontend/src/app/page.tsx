"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { apiService, type FileHistoryItem, type ModelHistoryItem } from "@/lib/api"
import {
  CloudArrowUpIcon,
  ChartBarIcon,
  CpuChipIcon,
  SparklesIcon,
  ArrowRightIcon,
  ClockIcon,
  DocumentTextIcon,
  PlayIcon,
} from "@heroicons/react/24/outline"

const features = [
  {
    icon: CloudArrowUpIcon,
    title: "Smart Upload",
    description: "Drag & drop CSV files with instant validation, type detection, and schema inference.",
    chip: "from-cyan-500/25 to-blue-500/25 text-cyan-300",
  },
  {
    icon: ChartBarIcon,
    title: "Data Profiling",
    description: "Automatic quality scoring, distributions, missing-value and correlation analysis.",
    chip: "from-violet-500/25 to-purple-500/25 text-violet-300",
  },
  {
    icon: CpuChipIcon,
    title: "AutoML Pipeline",
    description: "Train, tune, and cross-validate models across nine algorithms — no code.",
    chip: "from-emerald-500/25 to-teal-500/25 text-emerald-300",
  },
  {
    icon: SparklesIcon,
    title: "AI Insights",
    description: "Grounded, LLM-written summaries and recommendations from your real metrics.",
    chip: "from-amber-500/25 to-orange-500/25 text-amber-300",
  },
]

const quickActions = [
  { title: "Upload dataset", description: "Start with a CSV upload", icon: CloudArrowUpIcon, href: "/upload", chip: "from-cyan-500/25 to-blue-500/25 text-cyan-300" },
  { title: "Your models", description: "Manage trained models", icon: CpuChipIcon, href: "/models", chip: "from-violet-500/25 to-purple-500/25 text-violet-300" },
  { title: "Run predictions", description: "Score new data", icon: PlayIcon, href: "/models", chip: "from-emerald-500/25 to-teal-500/25 text-emerald-300" },
  { title: "History", description: "Past uploads and models", icon: DocumentTextIcon, href: "/history", chip: "from-amber-500/25 to-orange-500/25 text-amber-300" },
]

const steps = [
  { n: "01", title: "Upload", description: "Drop a CSV — we validate it and infer the schema." },
  { n: "02", title: "Profile", description: "Automatic quality, distributions, and correlations." },
  { n: "03", title: "Train", description: "Pick an algorithm; we train and evaluate it honestly." },
  { n: "04", title: "Predict", description: "Score new rows and read a grounded summary." },
]

// A unified activity item derived from the user's real file + model history
type ActivityItem = {
  id: string
  type: "upload" | "model"
  title: string
  description: string
  timestamp: string
  href: string
}

// Relative-time formatter (no extra deps) — "just now", "3h ago", "2d ago"
function timeAgo(iso?: string): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4 },
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { handleAuthRedirect } = useAuthRedirect()
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [activityLoaded, setActivityLoaded] = useState(false)

  // Pull the signed-in user's real upload + model history (no fabricated data).
  useEffect(() => {
    if (!isAuthenticated) {
      setRecentActivity([])
      setActivityLoaded(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [files, models] = await Promise.all([
          apiService.getFileHistory({ limit: 5 }).catch(() => [] as FileHistoryItem[]),
          apiService.getModelHistory({ limit: 5 }).catch(() => [] as ModelHistoryItem[]),
        ])

        const fileItems: ActivityItem[] = (files || []).map((f) => ({
          id: `file-${f.session_id}`,
          type: "upload",
          title: f.original_filename || f.filename,
          description:
            f.num_rows != null && f.num_columns != null
              ? `${f.num_rows.toLocaleString()} rows × ${f.num_columns} cols`
              : "Dataset uploaded",
          timestamp: f.processed_at || f.uploaded_at,
          href: `/profile/${f.session_id}`,
        }))

        const modelItems: ActivityItem[] = (models || []).map((m) => {
          const acc = m.evaluation_metrics?.accuracy ?? m.evaluation_metrics?.r2_score
          const accStr = typeof acc === "number" ? ` · ${(acc * 100).toFixed(1)}%` : ""
          return {
            id: `model-${m.model_id}`,
            type: "model",
            title: m.model_name || `${m.algorithm} model`,
            description: `${m.algorithm} · ${m.target_column}${accStr}`,
            timestamp: m.trained_at || m.created_at,
            href: `/summary/${m.model_id}`,
          }
        })

        const merged = [...fileItems, ...modelItems]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)

        if (!cancelled) {
          setRecentActivity(merged)
          setActivityLoaded(true)
        }
      } catch {
        if (!cancelled) setActivityLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="px-6 pt-20 pb-16">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-5 font-mono text-xs font-normal">
            AutoML for CSV data
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Turn raw CSVs into <span className="text-gradient">decisions</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Upload a dataset, get an automated profile, train a model, and read a grounded summary —
            no code required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="group" onClick={() => handleAuthRedirect("/upload")}>
              Get started
              <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/upload">Upload a CSV</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Quick actions — dashboard, signed-in only */}
      {isAuthenticated && (
        <section className="px-6 pb-16">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href} className="group">
                <Card className="glow-hover h-full">
                  <CardContent className="p-5">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${action.chip}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium text-foreground">{action.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{action.description}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capabilities</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Everything from upload to insight
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="glow-hover h-full">
                <CardHeader>
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${feature.chip}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent activity — signed-in users with real history only */}
      {isAuthenticated && activityLoaded && recentActivity.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <motion.div {...fadeUp} className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent activity</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Pick up where you left off</h2>
            </motion.div>

            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-elevated"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-elevated text-muted-foreground">
                    {activity.type === "upload" ? (
                      <CloudArrowUpIcon className="h-5 w-5" />
                    ) : (
                      <CpuChipIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
                      <Badge variant={activity.type === "model" ? "success" : "default"}>
                        {activity.type === "model" ? "model" : "dataset"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="h-3.5 w-3.5" />
                    <span className="font-mono">{timeAgo(activity.timestamp)}</span>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              From CSV to prediction in four steps
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <Card key={step.n} className="glow-hover h-full">
                <CardContent className="p-5">
                  <div className="font-mono text-2xl font-bold text-gradient">{step.n}</div>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="glow-primary border-primary/30 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ready to analyze your data?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Upload a CSV and get a profiled report in under a minute.
            </p>
            <div className="mt-7">
              <Button size="lg" className="group" onClick={() => handleAuthRedirect("/upload")}>
                Start your analysis
                <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
