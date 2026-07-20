"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  ArrowRightIcon,
  CpuChipIcon,
  CheckCircleIcon,
  SparklesIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SummaryModal } from "@/components/SummaryModal"
import { apiService } from "@/lib/api"
import PipelineStepper from "@/components/PipelineStepper"
import PageSkeleton from "@/components/PageSkeleton"
import ErrorState from "@/components/ErrorState"

interface TrainingState {
  isTraining: boolean
  progress: number
  currentStep: string
  modelId?: string
  results?: any
}

interface Algorithm {
  value: string
  label: string
  description: string
  icon: string
}

const algorithms: Algorithm[] = [
  {
    value: 'random_forest',
    label: 'Random Forest',
    description: 'Robust ensemble method with high accuracy',
    icon: '🌳'
  },
  {
    value: 'xgboost',
    label: 'XGBoost',
    description: 'Gradient boosting for superior performance',
    icon: '🚀'
  },
  {
    value: 'logistic_regression',
    label: 'Logistic Regression',
    description: 'Fast linear classification method',
    icon: '📈'
  },
  {
    value: 'svm',
    label: 'Support Vector Machine',
    description: 'Powerful kernel-based classifier',
    icon: '🎯'
  }
]

export default function TrainPage({ params }: { params: Promise<{ session: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [profileData, setProfileData] = useState<any>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('random_forest')
  const [testSize, setTestSize] = useState<number>(0.2)
  const [randomState, setRandomState] = useState<number>(42)
  const [trainingState, setTrainingState] = useState<TrainingState>({
    isTraining: false,
    progress: 0,
    currentStep: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean
    title: string
    summary: string
    insights: string[]
    type: 'dataset' | 'model'
  }>({
    isOpen: false,
    title: '',
    summary: '',
    insights: [],
    type: 'model'
  })

  useEffect(() => {
    loadProfileData(resolvedParams.session)
  }, [resolvedParams.session])

  const loadProfileData = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load profile data from backend API
      const data = await apiService.getDataProfile(sessionId)

      // Transform data for training interface
      const transformedData = {
        session_id: sessionId,
        column_profiles: data.column_profiles || {},
        dataset_info: data.dataset_info
      }

      setProfileData(transformedData)

      // Auto-detect target column
      const columns = Object.keys(data.column_profiles || {})
      const potentialTargets = columns.filter(col =>
        col.toLowerCase().includes('target') ||
        col.toLowerCase().includes('label') ||
        col.toLowerCase().includes('class') ||
        col.toLowerCase().includes('outcome') ||
        col.toLowerCase().includes('result')
      )

      // If no obvious target, suggest categorical columns with reasonable cardinality
      if (potentialTargets.length === 0) {
        const suitableTargets = Object.entries(data.column_profiles || {})
          .filter(([_, profile]: [string, any]) =>
            profile.type === 'categorical' &&
            profile.unique_values > 1 &&
            profile.unique_values <= 20
          )
          .map(([column, _]) => column)

        if (suitableTargets.length > 0) {
          setSelectedTarget(suitableTargets[0])
        }
      } else {
        setSelectedTarget(potentialTargets[0])
      }

      toast.success('Training interface loaded!')
    } catch (err: any) {
      console.error('Error loading profile data:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to load training data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const startTraining = async () => {
    if (!selectedTarget) {
      toast.error('Please select a target column')
      return
    }

    try {
      setTrainingState({
        isTraining: true,
        progress: 10,
        currentStep: 'Preparing data...'
      })

      // Prepare training request
      const trainingRequest = {
        session_id: resolvedParams.session,
        target_column: selectedTarget,
        algorithm: selectedAlgorithm,
        model_type: 'auto', // Let backend auto-detect classification vs regression
        test_size: testSize,
        random_state: randomState
      }

      setTrainingState(prev => ({
        ...prev,
        progress: 30,
        currentStep: 'Queuing training job...'
      }))

      // Kick off the async training job (returns 202 { model_id, status: "queued" })
      const { model_id } = await apiService.trainModel(trainingRequest)

      setTrainingState(prev => ({
        ...prev,
        progress: 55,
        modelId: model_id,
        currentStep: 'Training model...'
      }))

      // Poll the job to completion (status reflects real server-side progress)
      const final = await apiService.waitForTraining(model_id, {
        onTick: (status) =>
          setTrainingState(prev => ({
            ...prev,
            progress: status === 'completed' ? 95 : prev.progress < 88 ? prev.progress + 6 : prev.progress,
            currentStep: status === 'training' ? 'Training model…' : 'Finalizing results…',
          })),
      })

      if (final.status === 'failed') {
        throw new Error(final.error_message || 'Training failed. Please try again.')
      }

      // Assemble a result object matching what the results UI expects
      const result = {
        model_id,
        session_id: resolvedParams.session,
        model_type: final.problem_type,
        algorithm: final.algorithm,
        training_info: final.training_info || {},
        evaluation_metrics: final.evaluation_metrics || {},
        feature_importance: final.feature_importance || {},
      }

      setTrainingState({
        isTraining: false,
        progress: 100,
        currentStep: 'Training completed!',
        modelId: model_id,
        results: result
      })

      toast.success('Model trained successfully!')

      // Don't auto-redirect, let user choose next action

    } catch (err: any) {
      console.error('Training error:', err)
      const errorMessage = err.response?.data?.detail?.message || err.message || 'Training failed. Please try again.'
      setError(errorMessage)
      setTrainingState({
        isTraining: false,
        progress: 0,
        currentStep: ''
      })
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <PageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20">
        <ErrorState
          title="Training Setup Failed"
          message={error}
          onRetry={() => loadProfileData(resolvedParams.session)}
          actions={[
            { label: "Back to Profile", href: `/profile/${resolvedParams.session}`, variant: "outline" },
            { label: "Upload a Dataset", href: "/upload", variant: "outline" },
          ]}
        />
      </div>
    )
  }

  const columnOptions = profileData ? Object.entries(profileData.column_profiles)
    .map(([column, profile]: [string, any]) => ({
      value: column,
      label: column,
      type: profile.type,
      unique_values: profile.unique_values
    })) : []

  const trainingTime = trainingState.results?.training_info?.training_time

  return (
    <div className="min-h-screen pt-20">
      <PipelineStepper
        current="train"
        sessionId={resolvedParams.session}
        modelId={trainingState.modelId}
      />

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {!trainingState.isTraining && !trainingState.results ? (
              /* Training Configuration */
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                    Train Your Model
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Configure and train a machine learning model on your dataset
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Target Column Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                        Select Target Column
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Choose the column you want to predict
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {columnOptions.map(option => (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-center p-4 rounded-lg border cursor-pointer transition-colors",
                              selectedTarget === option.value
                                ? "border-primary/40 bg-elevated"
                                : "border-border bg-card hover:bg-elevated"
                            )}
                          >
                            <input
                              type="radio"
                              name="target"
                              value={option.value}
                              checked={selectedTarget === option.value}
                              onChange={(e) => setSelectedTarget(e.target.value)}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <div className="text-foreground font-semibold">{option.label}</div>
                              <div className="text-muted-foreground text-sm">
                                {option.type} • <span className="font-mono tabular-nums">{option.unique_values}</span> unique values
                              </div>
                            </div>
                            {selectedTarget === option.value && (
                              <CheckCircleIcon className="w-5 h-5 text-primary" />
                            )}
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Algorithm Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <CpuChipIcon className="w-5 h-5 mr-2 text-primary" />
                        Choose Algorithm
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Select the machine learning algorithm for training
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {algorithms.map(algo => (
                          <label
                            key={algo.value}
                            className={cn(
                              "p-4 rounded-lg border cursor-pointer transition-colors",
                              selectedAlgorithm === algo.value
                                ? "border-primary/40 bg-elevated"
                                : "border-border bg-card hover:bg-elevated"
                            )}
                          >
                            <input
                              type="radio"
                              name="algorithm"
                              value={algo.value}
                              checked={selectedAlgorithm === algo.value}
                              onChange={(e) => setSelectedAlgorithm(e.target.value)}
                              className="sr-only"
                            />
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-elevated text-primary flex items-center justify-center text-lg">
                                {algo.icon}
                              </div>
                              <div className="flex-1">
                                <div className="text-foreground font-semibold mb-1">{algo.label}</div>
                                <div className="text-muted-foreground text-sm">{algo.description}</div>
                              </div>
                              {selectedAlgorithm === algo.value && (
                                <CheckCircleIcon className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Training Parameters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <Cog6ToothIcon className="w-5 h-5 mr-2 text-primary" />
                        Training Parameters
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Fine-tune your model training settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-foreground font-medium mb-2">
                            Test Size: <span className="font-mono tabular-nums">{Math.round(testSize * 100)}%</span>
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="0.4"
                            step="0.05"
                            value={testSize}
                            onChange={(e) => setTestSize(parseFloat(e.target.value))}
                            className="w-full h-2 bg-elevated rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>10%</span>
                            <span>40%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-foreground font-medium mb-2">
                            Random State
                          </label>
                          <Input
                            type="number"
                            value={randomState}
                            onChange={(e) => setRandomState(parseInt(e.target.value))}
                            className="font-mono tabular-nums"
                          />
                          <p className="text-muted-foreground text-xs mt-1">For reproducible results</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Start Training Button */}
                  <div className="text-center">
                    <Button
                      onClick={startTraining}
                      disabled={!selectedTarget}
                      size="xl"
                    >
                      <CpuChipIcon className="w-5 h-5 mr-2" />
                      Start Training
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Button>
                    {!selectedTarget && (
                      <p className="text-muted-foreground text-sm mt-3">
                        Select a target column above to enable training.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : trainingState.isTraining ? (
              /* Training Progress */
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-8 bg-elevated text-primary rounded-lg flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <CpuChipIcon className="w-12 h-12" />
                  </motion.div>
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">Training in Progress</h1>
                <p className="text-xl text-muted-foreground mb-8">{trainingState.currentStep}</p>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto mb-8">
                  <Progress
                    value={trainingState.progress}
                    className="h-4 mb-2"
                  />
                  <p className="text-muted-foreground text-sm font-mono tabular-nums">{trainingState.progress}% complete</p>
                </div>

                {/* Training Info */}
                <Card className="max-w-md mx-auto">
                  <CardContent className="p-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Algorithm:</span>
                        <span className="text-foreground">{algorithms.find(a => a.value === selectedAlgorithm)?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="text-foreground">{selectedTarget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Test Size:</span>
                        <span className="text-foreground font-mono tabular-nums">{Math.round(testSize * 100)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Training Results */
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-8 bg-success/15 text-success rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-12 h-12" />
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">Training Complete</h1>
                <p className="text-xl text-muted-foreground mb-8">Your model has been successfully trained and is ready for predictions</p>

                {/* Results Summary */}
                {trainingState.results && (
                  <div className="space-y-6 mb-8">
                    {/* Main Metrics Card */}
                    <Card className="max-w-4xl mx-auto">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                          Training Results & Performance
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Comprehensive evaluation metrics for your trained model
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-6 text-left">
                          {/* Model Info */}
                          <div className="space-y-4">
                            <h4 className="text-foreground font-semibold mb-3">Model Information</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Model ID:</span>
                                <span className="text-foreground font-mono tabular-nums text-xs">{trainingState.modelId?.slice(-8)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Algorithm:</span>
                                <span className="text-foreground">{algorithms.find(a => a.value === selectedAlgorithm)?.label}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Target:</span>
                                <span className="text-foreground">{selectedTarget}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Test Size:</span>
                                <span className="text-foreground font-mono tabular-nums">{Math.round(testSize * 100)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="space-y-4">
                            <h4 className="text-foreground font-semibold mb-3">Performance Metrics</h4>
                            <div className="space-y-2">
                              {/* Classification Metrics */}
                              {trainingState.results.model_type === 'classification' ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Accuracy:</span>
                                    <span className="text-success font-bold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.accuracy
                                        ? (trainingState.results.evaluation_metrics.accuracy * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Precision:</span>
                                    <span className="text-foreground font-semibold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.precision
                                        ? (trainingState.results.evaluation_metrics.precision * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Recall:</span>
                                    <span className="text-foreground font-semibold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.recall
                                        ? (trainingState.results.evaluation_metrics.recall * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">F1-Score:</span>
                                    <span className="text-foreground font-semibold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.f1_score
                                        ? (trainingState.results.evaluation_metrics.f1_score * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                /* Regression Metrics */
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">R² Score:</span>
                                    <span className="text-success font-bold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.r2_score
                                        ? trainingState.results.evaluation_metrics.r2_score.toFixed(3)
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">RMSE:</span>
                                    <span className="text-foreground font-semibold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.rmse
                                        ? trainingState.results.evaluation_metrics.rmse.toFixed(3)
                                        : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">MAE:</span>
                                    <span className="text-foreground font-semibold font-mono tabular-nums">
                                      {trainingState.results.evaluation_metrics?.mae
                                        ? trainingState.results.evaluation_metrics.mae.toFixed(3)
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Training Details */}
                          <div className="space-y-4">
                            <h4 className="text-foreground font-semibold mb-3">Training Details</h4>
                            <div className="space-y-2">
                              {trainingTime != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Training Time:</span>
                                  <span className="text-foreground font-mono tabular-nums">{trainingTime}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Training Samples:</span>
                                <span className="text-foreground font-mono tabular-nums">
                                  {trainingState.results.training_info?.training_samples || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Test Samples:</span>
                                <span className="text-foreground font-mono tabular-nums">
                                  {trainingState.results.training_info?.test_samples || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Features Used:</span>
                                <span className="text-foreground font-mono tabular-nums">
                                  {trainingState.results.training_info?.features_count || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Summary Generation */}
                    <Card className="max-w-4xl mx-auto border-primary/40">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <SparklesIcon className="w-5 h-5 mr-2 text-primary" />
                          AI Training Summary
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Get AI-powered insights about your model's performance and recommendations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <Button
                            onClick={async () => {
                              const loadingToast = toast.loading('Generating training summary...')
                              try {
                                const data = await apiService.getModelSummary(trainingState.modelId!)

                                setSummaryModal({
                                  isOpen: true,
                                  title: 'Model Training Summary',
                                  summary: data.summary,
                                  insights: data.insights?.recommendations || [],
                                  type: 'model'
                                })

                                toast.dismiss(loadingToast)
                                toast.success('Training summary generated!')
                              } catch (err: any) {
                                console.error('Summary generation error:', err)
                                const errorMessage = err.response?.data?.detail?.message || 'Failed to generate training summary'
                                toast.dismiss(loadingToast)
                                toast.error(errorMessage)
                              }
                            }}
                            size="lg"
                            variant="secondary"
                          >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Training Summary
                          </Button>
                          <p className="text-muted-foreground text-sm mt-2">
                            Powered by OpenRouter + DeepSeek
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="xl">
                    <Link href={`/predict/${trainingState.modelId}`}>
                      Make Predictions
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>

                  <Button asChild size="xl" variant="outline">
                    <Link href={`/summary/${trainingState.modelId}`}>
                      View summary
                    </Link>
                  </Button>
                </div>

                {/* Quiet secondary links */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setTrainingState({ isTraining: false, progress: 0, currentStep: '' })
                      setSelectedTarget('')
                    }}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Train another model
                  </button>
                  <Link
                    href="/history"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View training history
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModal.isOpen}
        onClose={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
        title={summaryModal.title}
        summary={summaryModal.summary}
        insights={summaryModal.insights}
        type={summaryModal.type}
      />
    </div>
  )
}
