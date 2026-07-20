"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PipelineStepper from "@/components/PipelineStepper"
import ErrorState from "@/components/ErrorState"
import PageSkeleton from "@/components/PageSkeleton"

import {
  ArrowLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CpuChipIcon,
  EyeIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { apiService } from "@/lib/api"

interface ModelSummaryData {
  model_id: string
  dataset_summary: {
    total_rows: number
    total_columns: number
    missing_values: number
    duplicate_rows: number
    data_quality_score: number
  }
  model_summary: {
    algorithm: string
    problem_type: string
    target_column: string
    feature_count: number
    training_date: string
    model_file_size: string
    evaluation_metrics: Record<string, number>
  }
  insights: {
    model_insights: string[]
    data_insights: string[]
    performance_insights: string[]
    recommendations: string[]
  }
  natural_language_summary: string
  timestamp: string
}

interface LLMEnhancedSummary {
  model_id: string
  llm_enhanced_summaries: {
    dataset_summary: string
    model_summary: string
    combined_summary: string
  }
  llm_insights: {
    key_findings: string[]
    business_insights: string[]
    recommendations: string[]
    next_steps: string[]
  }
  technical_details: {
    algorithm: string
    problem_type: string
    feature_count: number
    target_column: string
    dataset_shape: number[]
    data_quality_score: number
  }
  api_info: {
    llm_model: string
    api_provider: string
    generation_timestamp: string
  }
}

export default function SummaryPage({ params }: { params: Promise<{ model: string }> }) {
  const resolvedParams = use(params)
  const [summaryData, setSummaryData] = useState<ModelSummaryData | null>(null)
  const [llmSummary, setLlmSummary] = useState<LLMEnhancedSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [llmLoading, setLlmLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)
  const [showLLMSummary, setShowLLMSummary] = useState(false)

  useEffect(() => {
    loadSummaryData(resolvedParams.model)
  }, [resolvedParams.model])

  const loadSummaryData = async (modelId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load basic summary first
      const data = await apiService.getModelSummary(modelId)
      setSummaryData(data)
      toast.success('Model summary loaded successfully!')
    } catch (err: any) {
      console.error('Error loading summary:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to load model summary'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadLLMSummary = async () => {
    try {
      setLlmLoading(true)
      setLlmError(null)
      const data = await apiService.getLLMEnhancedSummary(resolvedParams.model)
      setLlmSummary(data)
      setShowLLMSummary(true)
      toast.success('AI-enhanced summary generated!')
    } catch (err: any) {
      console.error('Error loading LLM summary:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to generate AI-enhanced summary'
      setLlmError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLlmLoading(false)
    }
  }

  if (loading) {
    return <PageSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20">
        <ErrorState
          title="Summary Not Available"
          message={error}
          onRetry={() => loadSummaryData(resolvedParams.model)}
          actions={[
            { label: "View in History", href: "/history", variant: "outline" },
            { label: "Upload New File", href: "/upload" },
          ]}
        />
      </div>
    )
  }

  if (!summaryData) return null

  const qualityScore = Math.round(summaryData.dataset_summary.data_quality_score * 100)
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-success'
    if (score >= 70) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Pipeline wayfinding */}
          <PipelineStepper current="predict" modelId={summaryData.model_id} className="mb-10" />

          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Model Analysis Summary
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive insights and performance analysis for your trained model
              </p>
              <div className="mt-4 inline-block">
                <Badge variant="outline" className="font-mono tabular-nums">
                  Model ID: {summaryData.model_id}
                </Badge>
              </div>
            </motion.div>
          </div>

          {/* AI Summary Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <Button
              onClick={loadLLMSummary}
              disabled={llmLoading}
              size="lg"
            >
              {llmLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5"
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </motion.div>
                  Generating AI Summary...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  {showLLMSummary ? "Regenerate AI Summary" : "Generate AI-Enhanced Summary"}
                </>
              )}
            </Button>
            <p className="text-muted-foreground text-sm mt-2">
              Powered by OpenRouter + DeepSeek for advanced insights
            </p>
          </motion.div>

          {/* LLM Summary error (inline + retry) */}
          {llmError && !llmLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-destructive/40 bg-destructive/15">
                <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                    <div>
                      <p className="font-semibold text-foreground">AI summary failed</p>
                      <p className="text-sm text-muted-foreground">{llmError}</p>
                    </div>
                  </div>
                  <Button onClick={loadLLMSummary} variant="outline" disabled={llmLoading}>
                    <ArrowPathIcon className="h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* LLM Enhanced Summary */}
          {showLLMSummary && llmSummary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-xl font-semibold">
                    <SparklesIcon className="w-6 h-6 text-primary mr-2" />
                    AI-Enhanced Analysis
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    Generated by {llmSummary.api_info.llm_model} via {llmSummary.api_info.api_provider}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Combined Summary */}
                  <div className="p-6 bg-elevated rounded-lg border border-border">
                    <h4 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                      <DocumentTextIcon className="w-6 h-6 mr-3 text-primary" />
                      Executive Summary
                    </h4>
                    <p className="text-foreground leading-relaxed whitespace-pre-line text-base">
                      {llmSummary.llm_enhanced_summaries.combined_summary}
                    </p>
                  </div>

                  {/* LLM Insights Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Key Findings */}
                    <div className="space-y-4 p-4 bg-elevated rounded-lg border border-border">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <EyeIcon className="w-5 h-5 mr-2 text-success" />
                        Key Findings
                      </h4>
                      <div className="space-y-3">
                        {llmSummary.llm_insights.key_findings?.map((finding, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 rounded-md">
                            <CheckCircleIcon className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-foreground text-sm leading-relaxed">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Business Insights */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                        Business Insights
                      </h4>
                      <div className="space-y-2">
                        {llmSummary.llm_insights.business_insights?.map((insight, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <InformationCircleIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground text-sm">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-4 p-4 bg-elevated rounded-lg border border-border">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <LightBulbIcon className="w-5 h-5 mr-2 text-warning" />
                        Recommendations
                      </h4>
                      <div className="space-y-3">
                        {llmSummary.llm_insights.recommendations?.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 rounded-md">
                            <LightBulbIcon className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                            <span className="text-foreground text-sm leading-relaxed">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-foreground flex items-center">
                        <ArrowLeftIcon className="w-5 h-5 mr-2 rotate-180 text-primary" />
                        Next Steps
                      </h4>
                      <div className="space-y-2">
                        {llmSummary.llm_insights.next_steps?.map((step, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <span className="w-4 h-4 bg-elevated text-primary text-xs font-mono tabular-nums rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-muted-foreground text-sm">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Traditional Summary (Always Shown) */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Dataset Overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-lg font-semibold">
                    <ChartBarIcon className="w-6 h-6 mr-3 text-primary" />
                    Dataset Overview
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    Key statistics about your training data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-elevated rounded-lg border border-border">
                      <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                        {summaryData.dataset_summary.total_rows.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-sm font-medium">Rows</div>
                    </div>
                    <div className="text-center p-4 bg-elevated rounded-lg border border-border">
                      <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                        {summaryData.dataset_summary.total_columns}
                      </div>
                      <div className="text-muted-foreground text-sm font-medium">Columns</div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-elevated rounded-lg border border-border">
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Data Quality</span>
                      <span className={`font-bold font-mono tabular-nums text-lg ${getQualityColor(qualityScore)}`}>
                        {qualityScore}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Missing Values</span>
                      <span className="text-foreground font-semibold font-mono tabular-nums">{summaryData.dataset_summary.missing_values.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Duplicate Rows</span>
                      <span className="text-foreground font-semibold font-mono tabular-nums">{summaryData.dataset_summary.duplicate_rows.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Model Overview */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-lg font-semibold">
                    <CpuChipIcon className="w-6 h-6 mr-3 text-primary" />
                    Model Overview
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    Details about your trained model
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 p-4 bg-elevated rounded-lg border border-border">
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Algorithm</span>
                      <span className="text-foreground font-semibold">
                        {summaryData.model_summary.algorithm.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Problem Type</span>
                      <span className="text-foreground font-semibold capitalize">
                        {summaryData.model_summary.problem_type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Target Column</span>
                      <span className="text-foreground font-semibold">
                        {summaryData.model_summary.target_column}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Features Used</span>
                      <span className="text-foreground font-semibold font-mono tabular-nums">
                        {summaryData.model_summary.feature_count}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded">
                      <span className="text-muted-foreground font-medium">Model Size</span>
                      <span className="text-foreground font-semibold font-mono tabular-nums">
                        {summaryData.model_summary.model_file_size}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Metrics */}
          {summaryData.model_summary.evaluation_metrics && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-lg font-semibold">
                    <ChartBarIcon className="w-6 h-6 mr-3 text-primary" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    Model evaluation results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      // Only scalar metrics are tiles — skip nested structures like
                      // per_class_report (object) and confusion_matrix (array).
                      const PERCENT = new Set([
                        'accuracy', 'precision', 'recall', 'f1_score', 'balanced_accuracy',
                        'roc_auc', 'cv_mean',
                      ])
                      const entries = Object.entries(summaryData.model_summary.evaluation_metrics)
                        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number))
                      return entries.map(([metric, value]) => {
                        const v = value as number
                        const display = PERCENT.has(metric) && v >= 0 && v <= 1
                          ? `${(v * 100).toFixed(1)}%`
                          : v.toFixed(4)
                        return (
                          <div key={metric} className="text-center p-4 rounded-lg border border-border bg-elevated">
                            <div className="text-3xl font-bold font-mono tabular-nums text-foreground mb-1">
                              {display}
                            </div>
                            <div className="text-muted-foreground text-sm capitalize font-medium">
                              {metric.replace(/_/g, ' ')}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Natural Language Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center text-xl font-semibold">
                  <DocumentTextIcon className="w-6 h-6 mr-3 text-primary" />
                  Summary
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  Human-readable analysis of your model and data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-elevated rounded-lg border border-border">
                  <p className="text-foreground leading-relaxed text-base">
                    {summaryData.natural_language_summary}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Insights and Recommendations */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Insights */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-lg font-semibold">
                    <EyeIcon className="w-6 h-6 mr-3 text-primary" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Model Insights */}
                  {summaryData.insights.model_insights.length > 0 && (
                    <div className="p-4 bg-elevated rounded-lg border border-border">
                      <h4 className="text-foreground font-semibold mb-3 flex items-center">
                        <CpuChipIcon className="w-5 h-5 mr-2 text-success" />
                        Model
                      </h4>
                      <div className="space-y-3">
                        {summaryData.insights.model_insights.map((insight, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 rounded">
                            <CheckCircleIcon className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-foreground text-sm leading-relaxed">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Insights */}
                  {summaryData.insights.data_insights.length > 0 && (
                    <div className="p-4 bg-elevated rounded-lg border border-border">
                      <h4 className="text-foreground font-semibold mb-3 flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                        Data
                      </h4>
                      <div className="space-y-3">
                        {summaryData.insights.data_insights.map((insight, index) => (
                          <div key={index} className="flex items-start space-x-3 p-2 rounded">
                            <InformationCircleIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-foreground text-sm leading-relaxed">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center text-lg font-semibold">
                    <LightBulbIcon className="w-6 h-6 mr-3 text-warning" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-elevated rounded-lg border border-border">
                    <div className="space-y-3">
                      {summaryData.insights.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3 p-2 rounded">
                          <LightBulbIcon className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                          <span className="text-foreground text-sm leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button asChild size="xl">
              <Link href={`/predict/${resolvedParams.model}`}>
                Make Predictions
                <ArrowLeftIcon className="w-5 h-5 rotate-180" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="xl">
              <Link href="/history">View in History</Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
