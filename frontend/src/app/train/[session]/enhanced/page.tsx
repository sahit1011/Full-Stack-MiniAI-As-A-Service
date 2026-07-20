"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRightIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  StarIcon,
  LightBulbIcon,
  RocketLaunchIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SummaryModal } from "@/components/SummaryModal"
import { apiService } from "@/lib/api"
import PipelineStepper from "@/components/PipelineStepper"
import ErrorState from "@/components/ErrorState"
import PageSkeleton from "@/components/PageSkeleton"

interface TrainingState {
  isTraining: boolean
  progress: number
  currentStep: string
  modelId?: string
  results?: any
}

interface ModelRecommendation {
  model_name: string
  score: number
  reasons: string[]
  suitability_factors: Record<string, any>
  recommended_params: Record<string, any>
  model_info: {
    best_for: string
    complexity: string
    training_time: string
  }
}

interface TargetRecommendation {
  column: string
  score: number
  reasons: string[]
  problem_type: string
  suitability_score: number
}

export default function EnhancedTrainPage({ params }: { params: Promise<{ session: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [profileData, setProfileData] = useState<any>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [problemType, setProblemType] = useState<string>('auto')
  const [problemTypeError, setProblemTypeError] = useState(false)
  const [modelRecommendations, setModelRecommendations] = useState<ModelRecommendation[]>([])
  const [targetRecommendations, setTargetRecommendations] = useState<TargetRecommendation[]>([])
  const [intelligentAnalysis, setIntelligentAnalysis] = useState<any>(null)
  const [trainingState, setTrainingState] = useState<TrainingState>({
    isTraining: false,
    progress: 0,
    currentStep: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
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
    loadEnhancedData(resolvedParams.session)
  }, [resolvedParams.session])

  const loadEnhancedData = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load profile data
      const profileData = await apiService.getDataProfile(sessionId)

      setProfileData({
        session_id: sessionId,
        column_profiles: profileData.column_profiles || {},
        dataset_info: profileData.dataset_info
      })

      // Load intelligent analysis
      try {
        const analysisData = await apiService.getIntelligentAnalysis(sessionId)
        setIntelligentAnalysis(analysisData.analysis)
      } catch (err) {
        console.warn('Intelligent analysis not available:', err)
      }

      // Load target recommendations
      try {
        const targetResponse = await apiService.getTargetRecommendations(sessionId)
        const targetData = targetResponse.target_recommendations?.recommended_targets || []

        // Ensure targetData is an array
        const targetRecs = Array.isArray(targetData) ? targetData : []
        setTargetRecommendations(targetRecs)

        // Auto-select best target
        if (targetRecs.length > 0) {
          setSelectedTarget(targetRecs[0].column)
        }
      } catch (err) {
        console.warn('Target recommendations not available:', err)
        setTargetRecommendations([]) // Ensure it's an empty array

        // Fallback to basic target detection
        const columns = Object.keys(profileData.column_profiles || {})
        const potentialTargets = columns.filter(col =>
          col.toLowerCase().includes('target') ||
          col.toLowerCase().includes('label') ||
          col.toLowerCase().includes('class')
        )
        if (potentialTargets.length > 0) {
          setSelectedTarget(potentialTargets[0])
        }
      }

      toast.success('Enhanced training interface loaded!')
    } catch (err: any) {
      console.error('Error loading enhanced data:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to load enhanced training data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadModelRecommendations = async () => {
    if (!selectedTarget) return

    try {
      setLoadingRecommendations(true)
      setProblemTypeError(false)
      const response = await apiService.getModelRecommendations(
        resolvedParams.session,
        selectedTarget,
        problemType
      )

      const recommendations = response.model_recommendations || []
      // Ensure recommendations is an array
      const validRecommendations = Array.isArray(recommendations) ? recommendations : []
      setModelRecommendations(validRecommendations)

      // Auto-select best model
      if (validRecommendations.length > 0) {
        setSelectedModel(validRecommendations[0].model_name)
      }

      // Update problem type if auto-detected
      if (response.problem_type && response.problem_type !== 'auto') {
        setProblemType(response.problem_type)
      }

      toast.success(`Found ${validRecommendations.length} model recommendations!`)
    } catch (err: any) {
      console.error('Error loading model recommendations:', err)
      setProblemTypeError(true)
      toast.error('Failed to load model recommendations')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  useEffect(() => {
    if (selectedTarget && !loadingRecommendations) {
      loadModelRecommendations()
    }
  }, [selectedTarget, problemType])

  const startEnhancedTraining = async () => {
    if (!selectedTarget || !selectedModel) {
      toast.error('Please select both target column and model')
      return
    }

    try {
      setTrainingState({
        isTraining: true,
        progress: 10,
        currentStep: 'Initializing enhanced training pipeline...'
      })

      const trainingRequest = {
        target_column: selectedTarget,
        model_name: selectedModel,
        problem_type: problemType === 'auto' ? undefined : problemType
      }

      setTrainingState(prev => ({
        ...prev,
        progress: 30,
        currentStep: 'Queuing enhanced training job...'
      }))

      // Kick off the async enhanced job (202 { model_id, status: "queued" })
      const { model_id } = await apiService.trainEnhancedModel(resolvedParams.session, trainingRequest)

      setTrainingState(prev => ({
        ...prev,
        progress: 55,
        modelId: model_id,
        currentStep: 'Training with enhanced pipeline (tuning + cross-validation)…'
      }))

      // Poll to completion — enhanced training tunes hyperparameters, so it can take longer
      const final = await apiService.waitForTraining(model_id, {
        intervalMs: 2000,
        onTick: (status) =>
          setTrainingState(prev => ({
            ...prev,
            progress: status === 'completed' ? 95 : prev.progress < 88 ? prev.progress + 5 : prev.progress,
            currentStep: status === 'training'
              ? 'Training with enhanced pipeline (tuning + cross-validation)…'
              : 'Finalizing enhanced results…',
          })),
      })

      if (final.status === 'failed') {
        throw new Error(final.error_message || 'Enhanced training failed. Please try again.')
      }

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
        currentStep: 'Enhanced training completed!',
        modelId: model_id,
        results: result
      })

      toast.success('Enhanced model trained successfully!')

    } catch (err: any) {
      console.error('Enhanced training error:', err)
      const errorMessage = err.response?.data?.detail?.message || err.message || 'Enhanced training failed. Please try again.'
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
        <PipelineStepper current="train" sessionId={resolvedParams.session} />
        <PageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20">
        <PipelineStepper current="train" sessionId={resolvedParams.session} />
        <ErrorState
          title="Enhanced Training Setup Failed"
          message={error}
          onRetry={() => loadEnhancedData(resolvedParams.session)}
          actions={[{ label: "Back to Profile", href: `/profile/${resolvedParams.session}`, variant: "outline" }]}
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

  return (
    <div className="min-h-screen pt-20">
      <PipelineStepper current="train" sessionId={resolvedParams.session} />

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {!trainingState.isTraining && !trainingState.results ? (
              /* Enhanced Training Configuration */
              <motion.div
                key="enhanced-config"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <div className="text-center mb-12">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-10 h-10 mr-3 rounded-lg bg-elevated text-primary flex items-center justify-center">
                      <RocketLaunchIcon className="w-6 h-6" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                      Enhanced Training
                    </h1>
                  </div>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Leverage AI-powered recommendations and intelligent analysis for optimal model performance
                  </p>
                  <p className="text-sm text-muted-foreground max-w-3xl mx-auto mt-3">
                    Enhanced: AI recommends the target and model and tunes it.
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Intelligent Analysis Summary */}
                  {intelligentAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <LightBulbIcon className="w-5 h-5 mr-2 text-primary" />
                          AI Dataset Analysis
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Intelligent insights about your dataset
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-foreground font-semibold mb-3">Dataset Characteristics</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Complexity:</span>
                                <Badge variant="outline">
                                  {intelligentAnalysis.dataset_complexity || 'Medium'}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quality Score:</span>
                                <span className="text-success font-semibold">
                                  {intelligentAnalysis.quality_score || 'Good'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-foreground font-semibold mb-3">Recommendations</h4>
                            <div className="space-y-1 text-sm">
                              {intelligentAnalysis.recommendations?.slice(0, 3).map((rec: string, idx: number) => (
                                <div key={idx} className="flex items-start space-x-2">
                                  <StarIcon className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{rec}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Smart Target Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                        Smart Target Selection
                        <Badge variant="success" className="ml-2">
                          AI Recommended
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        AI-powered target column recommendations based on dataset analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.isArray(targetRecommendations) && targetRecommendations.length > 0 ? (
                          targetRecommendations.slice(0, 3).map((target, idx) => (
                            <label
                              key={target.column}
                              className={cn(
                                "flex items-center p-4 rounded-lg border cursor-pointer transition-colors",
                                selectedTarget === target.column
                                  ? "border-primary/40 bg-elevated"
                                  : "border-border bg-card hover:bg-elevated"
                              )}
                            >
                              <input
                                type="radio"
                                name="target"
                                value={target.column}
                                checked={selectedTarget === target.column}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                                className="sr-only"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="text-foreground font-semibold font-mono">{target.column}</div>
                                  <Badge variant="outline">
                                    {target.problem_type}
                                  </Badge>
                                  <div className="flex items-center space-x-1">
                                    <StarIcon className="w-4 h-4 text-primary" />
                                    <span className="text-foreground font-semibold font-mono tabular-nums">{target.score}</span>
                                  </div>
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {target.reasons.slice(0, 2).join(' • ')}
                                </div>
                              </div>
                              {selectedTarget === target.column && (
                                <CheckCircleIcon className="w-5 h-5 text-primary" />
                              )}
                            </label>
                          ))
                        ) : (
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
                                  <div className="text-foreground font-semibold font-mono">{option.label}</div>
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
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Model Recommendations */}
                  {selectedTarget && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <CpuChipIcon className="w-5 h-5 mr-2 text-primary" />
                          AI Model Recommendations
                          <Badge variant="default" className="ml-2">
                            Intelligent Selection
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Optimized model suggestions based on your data characteristics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingRecommendations ? (
                          <div className="text-center py-8">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="w-8 h-8 mx-auto mb-4 bg-elevated text-primary rounded-lg flex items-center justify-center"
                            >
                              <SparklesIcon className="w-4 h-4" />
                            </motion.div>
                            <p className="text-muted-foreground">Analyzing your data for optimal model recommendations...</p>
                          </div>
                        ) : Array.isArray(modelRecommendations) && modelRecommendations.length > 0 ? (
                          <div className="space-y-4">
                            {modelRecommendations.slice(0, 4).map((model, idx) => (
                              <label
                                key={model.model_name}
                                className={cn(
                                  "block p-4 rounded-lg border cursor-pointer transition-colors",
                                  selectedModel === model.model_name
                                    ? "border-primary/40 bg-elevated"
                                    : "border-border bg-card hover:bg-elevated"
                                )}
                              >
                                <input
                                  type="radio"
                                  name="model"
                                  value={model.model_name}
                                  checked={selectedModel === model.model_name}
                                  onChange={(e) => setSelectedModel(e.target.value)}
                                  className="sr-only"
                                />
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className="text-foreground font-semibold capitalize">
                                        {model.model_name.replace(/_/g, ' ')}
                                      </div>
                                      {idx === 0 && (
                                        <Badge variant="warning">
                                          <StarIcon className="w-3 h-3 mr-1" />
                                          Best Match
                                        </Badge>
                                      )}
                                      <div className="flex items-center space-x-1">
                                        <span className="text-success font-bold font-mono tabular-nums">{model.score}</span>
                                        <span className="text-muted-foreground text-sm">score</span>
                                      </div>
                                    </div>
                                    <div className="text-muted-foreground text-sm mb-3">
                                      {model.model_info.best_for}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <Badge variant="outline" className="text-xs">
                                        {model.model_info.complexity} complexity
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {model.model_info.training_time} training
                                      </Badge>
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      <strong className="text-foreground">Why recommended:</strong> {model.reasons.slice(0, 2).join(' • ')}
                                    </div>
                                  </div>
                                  {selectedModel === model.model_name && (
                                    <CheckCircleIcon className="w-5 h-5 text-primary ml-4" />
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CpuChipIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Select a target column to see model recommendations</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Problem Type Detection */}
                  {selectedTarget && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <Cog6ToothIcon className="w-5 h-5 mr-2 text-primary" />
                          Problem Type Detection
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Automatically detected based on target column analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {problemTypeError ? (
                          /* Failed state */
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
                              <span className="text-destructive text-sm">Couldn&apos;t auto-detect the problem type</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={loadModelRecommendations}
                              disabled={loadingRecommendations}
                            >
                              Retry detection
                            </Button>
                          </div>
                        ) : loadingRecommendations && problemType === 'auto' ? (
                          /* Detecting state */
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Detected Type:</span>
                            <Badge variant="outline">Auto-detecting...</Badge>
                          </div>
                        ) : (
                          /* Resolved state */
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">Detected Type:</span>
                              <Badge variant="default" className="capitalize">
                                {problemType === 'auto' ? 'Classification / Regression' : problemType}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircleIcon className="w-4 h-4 text-success" />
                              <span className="text-success text-sm">Automatically optimized</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Training Button */}
                  <div className="text-center">
                    <Button
                      onClick={startEnhancedTraining}
                      disabled={!selectedTarget || !selectedModel || loadingRecommendations}
                      size="xl"
                      className="group"
                    >
                      <RocketLaunchIcon className="w-5 h-5 mr-2" />
                      Start Enhanced Training
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <p className="text-muted-foreground text-sm mt-2">
                      Powered by intelligent model selection and optimization
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : trainingState.isTraining ? (
              /* Enhanced Training Progress */
              <motion.div
                key="enhanced-training"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-8 bg-elevated text-primary rounded-lg flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <RocketLaunchIcon className="w-10 h-10" />
                  </motion.div>
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">Enhanced Training in Progress</h1>
                <p className="text-xl text-muted-foreground mb-8">{trainingState.currentStep}</p>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto mb-8">
                  <Progress
                    value={trainingState.progress}
                    className="h-4 mb-2"
                  />
                  <p className="text-muted-foreground text-sm font-mono tabular-nums">{trainingState.progress}% complete</p>
                </div>

                {/* Enhanced Training Info */}
                <Card className="max-w-md mx-auto">
                  <CardContent className="p-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="text-foreground capitalize">{selectedModel?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="text-foreground font-mono">{selectedTarget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="text-foreground capitalize">{problemType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pipeline:</span>
                        <Badge variant="secondary">Enhanced</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Enhanced Training Results */
              <motion.div
                key="enhanced-results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-8 bg-success/15 text-success rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-10 h-10" />
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">Enhanced Training Complete</h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Your model has been trained with our enhanced pipeline and intelligent optimizations
                </p>

                {/* Enhanced Results Summary */}
                {trainingState.results && (
                  <div className="space-y-6 mb-8">
                    {/* Main Metrics Card */}
                    <Card className="max-w-5xl mx-auto">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                          Enhanced Training Results & Performance
                          <Badge variant="success" className="ml-2">
                            Optimized
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Comprehensive evaluation metrics from your enhanced training pipeline
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-6 text-left">
                          {/* Model Info */}
                          <div className="space-y-4">
                            <h4 className="text-foreground font-semibold mb-3">Enhanced Model Info</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Model ID:</span>
                                <span className="text-foreground font-mono tabular-nums text-xs">{trainingState.modelId?.slice(-8)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Algorithm:</span>
                                <span className="text-foreground capitalize">{selectedModel?.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Target:</span>
                                <span className="text-foreground font-mono">{selectedTarget}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pipeline:</span>
                                <Badge variant="secondary">Enhanced</Badge>
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

                          {/* Enhanced Features */}
                          <div className="space-y-4">
                            <h4 className="text-foreground font-semibold mb-3">Enhanced Features</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="w-4 h-4 text-success" />
                                <span className="text-muted-foreground text-sm">AI Model Selection</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="w-4 h-4 text-success" />
                                <span className="text-muted-foreground text-sm">Intelligent Preprocessing</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="w-4 h-4 text-success" />
                                <span className="text-muted-foreground text-sm">Auto Hyperparameters</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CheckCircleIcon className="w-4 h-4 text-success" />
                                <span className="text-muted-foreground text-sm">Enhanced Validation</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Summary Generation */}
                    <Card className="max-w-5xl mx-auto">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <SparklesIcon className="w-5 h-5 mr-2 text-primary" />
                          AI Enhanced Training Summary
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Get AI-powered insights about your enhanced model&apos;s performance and recommendations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <Button
                            onClick={async () => {
                              const loadingToast = toast.loading('Generating enhanced training summary...')
                              try {
                                const data = await apiService.getModelSummary(trainingState.modelId!)

                                setSummaryModal({
                                  isOpen: true,
                                  title: 'Enhanced Model Training Summary',
                                  summary: data.summary,
                                  insights: data.insights?.recommendations || [],
                                  type: 'model'
                                })

                                toast.dismiss(loadingToast)
                                toast.success('Enhanced training summary generated!')
                              } catch (err: any) {
                                console.error('Summary generation error:', err)
                                const errorMessage = err.response?.data?.detail?.message || 'Failed to generate enhanced training summary'
                                toast.dismiss(loadingToast)
                                toast.error(errorMessage)
                              }
                            }}
                            size="lg"
                            variant="secondary"
                            className="group"
                          >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            Generate Enhanced Summary
                          </Button>
                          <p className="text-muted-foreground text-sm mt-2">
                            Powered by OpenRouter + DeepSeek with enhanced insights
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="xl" className="group">
                    <Link href={`/predict/${trainingState.modelId}`}>
                      Make Predictions
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>

                  <Button asChild size="xl" variant="outline">
                    <Link href={`/summary/${trainingState.modelId}`}>
                      View Detailed Summary
                    </Link>
                  </Button>
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
