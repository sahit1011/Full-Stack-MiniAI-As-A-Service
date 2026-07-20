"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CpuChipIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { apiService } from "@/lib/api"
import ProtectedRoute from "@/components/ProtectedRoute"

interface ModelInfo {
  model_id: string
  algorithm: string
  problem_type: string
  target_column: string
  session_id: string
  created_timestamp: string
  feature_count: number
}

function ModelsPageContent() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiService.getAvailableModels()

      setModels(data.models || [])
      toast.success(`Found ${data.count} trained models`)
    } catch (err: any) {
      console.error('Error loading models:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to load models'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 bg-elevated rounded-lg flex items-center justify-center"
          >
            <CpuChipIcon className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Loading Models</h2>
          <p className="text-muted-foreground">Fetching your trained models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <CpuChipIcon className="w-12 h-12 text-primary mr-3" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Your Models
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Manage and explore all your trained machine learning models
            </p>
          </div>

          {error ? (
            <div className="text-center">
              <Card className="border-destructive/40 max-w-md mx-auto">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center gap-2 text-destructive mb-4">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="font-medium">Error Loading Models</span>
                  </div>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={loadModels} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center">
              <Card className="max-w-md mx-auto">
                <CardContent className="p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-elevated rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No Models Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start by uploading a dataset and training your first model
                  </p>
                  <Button asChild>
                    <Link href="/upload">
                      <RocketLaunchIcon className="w-4 h-4 mr-2" />
                      Get Started
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((model, index) => (
                <motion.div
                  key={model.model_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-lg bg-elevated text-primary flex items-center justify-center mb-3">
                          <CpuChipIcon className="w-6 h-6" />
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {model.problem_type}
                        </Badge>
                      </div>
                      <CardTitle className="text-foreground capitalize">
                        {model.algorithm.replace(/_/g, ' ')}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Target: {model.target_column}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Features:</span>
                          <span className="text-foreground font-mono tabular-nums">{model.feature_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Model ID:</span>
                          <span className="text-foreground font-mono tabular-nums text-xs">{model.model_id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="text-foreground font-mono tabular-nums text-xs">
                            {model.created_timestamp ? formatDistanceToNow(new Date(model.created_timestamp), { addSuffix: true }) : 'Unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm">
                          <Link href={`/predict/${model.model_id}`}>
                            <ChartBarIcon className="w-4 h-4 mr-2" />
                            Make Predictions
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/summary/${model.model_id}`}>
                            <DocumentTextIcon className="w-4 h-4 mr-2" />
                            View Summary
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ModelsPage() {
  return (
    <ProtectedRoute>
      <ModelsPageContent />
    </ProtectedRoute>
  )
}
