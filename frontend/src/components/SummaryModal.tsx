"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  XMarkIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline"

interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  summary: string
  insights?: string[]
  dataQualityScore?: number
  type: 'dataset' | 'model'
}

export function SummaryModal({
  isOpen,
  onClose,
  title,
  summary,
  insights = [],
  dataQualityScore,
  type,
}: SummaryModalProps) {
  if (!isOpen) return null

  // Full literal class strings (Tailwind JIT can't see dynamically-built names)
  const quality = (score: number) =>
    score >= 0.8
      ? { bar: "bg-success", text: "text-success" }
      : score >= 0.6
        ? { bar: "bg-warning", text: "text-warning" }
        : { bar: "bg-destructive", text: "text-destructive" }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-elevated text-primary">
                {type === 'dataset' ? <ChartBarIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">
                  {type === 'dataset' ? 'Dataset analysis summary' : 'Model training summary'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Data quality score (dataset summaries) */}
              {type === 'dataset' && dataQualityScore !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <ChartBarIcon className="h-5 w-5 text-muted-foreground" />
                      Data quality score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${quality(dataQualityScore).bar} transition-all duration-500`}
                          style={{ width: `${dataQualityScore * 100}%` }}
                        />
                      </div>
                      <span className={`font-mono text-lg font-semibold tabular-nums ${quality(dataQualityScore).text}`}>
                        {(dataQualityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Main summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                    AI-generated summary
                  </CardTitle>
                  <CardDescription>Comprehensive analysis grounded in your data&apos;s real metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground">{summary}</p>
                </CardContent>
              </Card>

              {/* Key insights */}
              {insights.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <LightBulbIcon className="h-5 w-5 text-muted-foreground" />
                      Key insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-md border border-border bg-elevated p-3"
                        >
                          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <p className="text-sm text-muted-foreground">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border p-6">
            <p className="text-sm text-muted-foreground">AI-generated summary</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
