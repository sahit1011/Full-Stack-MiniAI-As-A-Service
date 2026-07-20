"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftIcon, SparklesIcon, DocumentArrowUpIcon, TableCellsIcon } from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { apiService } from "@/lib/api"
import ProtectedRoute from "@/components/ProtectedRoute"
import PipelineStepper from "@/components/PipelineStepper"
import ErrorState from "@/components/ErrorState"
import PageSkeleton from "@/components/PageSkeleton"

interface PredictionInput {
  [key: string]: string | number
}

interface PredictionResult {
  prediction: any
  confidence?: number | null
  probabilities?: Record<string, number> | null
}

interface ModelInfo {
  model_id: string
  algorithm: string
  features: string[]
  accuracy?: number
}

function PredictPageContent({ params, searchParams }: {
  params: Promise<{ model: string }>
  searchParams?: Promise<{ model_id?: string; session_id?: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const resolvedSearchParams = use(
    searchParams || Promise.resolve({} as { model_id?: string; session_id?: string })
  )
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [inputData, setInputData] = useState<PredictionInput>({})
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [batchFile, setBatchFile] = useState<File | null>(null)
  const [batchResults, setBatchResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modelId = resolvedSearchParams?.model_id || resolvedParams.model
  const sessionId = resolvedSearchParams?.session_id || resolvedParams.model

  useEffect(() => {
    // Only load model info if we have a valid model ID
    if (modelId && modelId !== 'default') {
      loadModelInfo(modelId, sessionId)
    } else {
      // If no valid model ID, try to load available models and use the first one
      loadAvailableModelsAndSelectFirst()
    }
  }, [modelId, sessionId])

  const loadAvailableModelsAndSelectFirst = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiService.getAvailableModels()

      if (data.models && data.models.length > 0) {
        const firstModel = data.models[0]
        // Redirect to the first available model
        router.push(`/predict/${firstModel.model_id}?model_id=${firstModel.model_id}`)
      } else {
        setError('No trained models available. Please train a model first.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Error loading available models:', err)
      setError('No model ID provided and failed to load available models. Please select a model from the models page.')
      setLoading(false)
    }
  }

  const loadModelInfo = async (modelId: string, sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Use the proper model info endpoint instead of trying to reconstruct from data profile
      const modelData = await apiService.getModelInfo(modelId)

      const features = modelData.features?.all_features || []

      // Use the model's real, persisted score when available — never a fabricated one
      const realScore = modelData.metrics?.accuracy ?? modelData.metrics?.r2_score

      const modelInfo: ModelInfo = {
        model_id: modelId,
        algorithm: modelData.algorithm || 'Unknown',
        features: features,
        accuracy: typeof realScore === 'number' ? realScore : undefined
      }

      setModelInfo(modelInfo)

      // Initialize input data for all features
      const initialInput: PredictionInput = {}
      features.forEach((feature: string) => {
        initialInput[feature] = ''
      })
      setInputData(initialInput)

      toast.success(`Model loaded successfully! Algorithm: ${modelData.algorithm}`)
    } catch (err: any) {
      console.error('Error loading model info:', err)
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })

      // Check if it's an authentication error
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in to access model information.')
        toast.error('Please log in to access this model')
        // Redirect to login page
        router.push('/login')
        return
      }

      // Check if it's a model not found error
      if (err.response?.status === 404) {
        setError(`Model ${modelId} not found. The model may have been deleted or the ID is incorrect.`)
        toast.error('Model not found')
        // Try to redirect to models page after a delay
        setTimeout(() => {
          router.push('/models')
        }, 2000)
        return
      }

      // For other errors, try to fall back to session-based approach for backward compatibility
      console.log('Falling back to session-based data profile approach...')
      try {
        const profileData = await apiService.getDataProfile(sessionId)

        const allColumns = Object.keys(profileData.column_profiles || {})
        const potentialTargets = allColumns.filter(col =>
          col.toLowerCase().includes('target') ||
          col.toLowerCase().includes('label') ||
          col.toLowerCase().includes('class')
        )

        const targetColumn = potentialTargets[0] || 'target'
        const features = allColumns.filter(col => col !== targetColumn)

        const modelInfo: ModelInfo = {
          model_id: modelId,
          algorithm: 'Unknown',
          features: features,
          accuracy: undefined
        }

        setModelInfo(modelInfo)

        const initialInput: PredictionInput = {}
        features.forEach((feature: string) => {
          initialInput[feature] = ''
        })
        setInputData(initialInput)

        toast.success('Model loaded successfully (fallback method)!')
      } catch (fallbackErr: any) {
        console.error('Fallback method also failed:', fallbackErr)
        console.error('Fallback error details:', {
          status: fallbackErr.response?.status,
          data: fallbackErr.response?.data,
          message: fallbackErr.message
        })

        const errorMessage = err.response?.data?.detail?.message ||
                            fallbackErr.response?.data?.detail?.message ||
                            'Failed to load model information. Please check if you are logged in and the model exists.'
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateInputValue = (feature: string, value: string) => {
    setInputData(prev => ({
      ...prev,
      [feature]: value
    }))
  }

  // Every feature must have a non-empty value before we allow a prediction.
  const allInputsFilled =
    !!modelInfo &&
    modelInfo.features.length > 0 &&
    modelInfo.features.every(
      (feature) => String(inputData[feature] ?? '').trim() !== ''
    )

  const makePrediction = async () => {
    if (!modelInfo || modelInfo.features.length === 0) {
      toast.error('No input data provided')
      return
    }

    if (!allInputsFilled) {
      toast.error('Please fill in all input fields before generating a prediction')
      return
    }

    try {
      setPredicting(true)

      const predictionRequest = {
        model_id: modelId,
        data: [inputData]
      }

      const result = await apiService.makePredictions(predictionRequest)

      if (result.predictions && result.predictions.length > 0) {
        setPrediction(result.predictions[0])
        toast.success('Prediction generated successfully!')
      }
    } catch (err: any) {
      console.error('Prediction error:', err)

      // Handle authentication errors
      if (err.response?.status === 401) {
        toast.error('Please log in to make predictions')
        router.push('/login')
        return
      }

      // Handle model not found errors
      if (err.response?.status === 404) {
        toast.error('Model not found. Redirecting to models page...')
        setTimeout(() => {
          router.push('/models')
        }, 2000)
        return
      }

      const errorMessage = err.response?.data?.detail?.message ||
                          err.response?.data?.message ||
                          'Prediction failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setPredicting(false)
    }
  }

  const makeBatchPrediction = async () => {
    if (!batchFile) {
      toast.error('Please select a CSV file for batch prediction')
      return
    }

    try {
      setPredicting(true)

      // Parse CSV file
      const text = await batchFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())

      const batchData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, index) => {
          const value = values[index]
          // Try to parse as number, otherwise keep as string
          row[header] = isNaN(Number(value)) ? value : Number(value)
        })
        return row
      })

      if (batchData.length === 0) {
        toast.error('No data found in CSV file')
        return
      }

      const response = await apiService.makeBatchPredictions({
        model_id: modelId,
        data: batchData
      })

      setBatchResults(response)
      toast.success(`Batch prediction completed! ${response.count} predictions generated.`)

    } catch (err: any) {
      console.error('Batch prediction error:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Batch prediction failed. Please try again.'
      toast.error(errorMessage)
    } finally {
      setPredicting(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setBatchFile(file)
      setBatchResults(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorState
          title="Model Load Failed"
          message={error}
          onRetry={() => loadModelInfo(modelId, sessionId)}
          actions={[
            { label: "View Available Models", href: "/models" },
            { label: "Upload New Data", href: "/upload", variant: "outline" },
            { label: "Login", href: "/login", variant: "ghost" },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/upload" className="flex items-center space-x-3 group">
            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">Back to Upload</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">AI Prediction Interface</h1>
        </div>
      </nav>

      <PipelineStepper current="predict" modelId={modelId} />

      <main className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Make Predictions
            </h1>
            <p className="text-xl text-muted-foreground">
              Use your trained model to generate predictions
            </p>
          </div>

          {modelInfo && (
            <Card className="mb-8 border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Model Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model ID:</span>
                    <div className="text-foreground font-mono tabular-nums text-xs">{modelInfo.model_id}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Algorithm:</span>
                    <div className="text-foreground">{modelInfo.algorithm}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>
                    <div className="text-success font-mono tabular-nums font-bold">
                      {typeof modelInfo.accuracy === 'number'
                        ? `${(modelInfo.accuracy * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prediction Tabs */}
          <Card className="mb-8 border border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Prediction Interface</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant={activeTab === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('single')}
                  >
                    <TableCellsIcon className="w-4 h-4 mr-2" />
                    Single Prediction
                  </Button>
                  <Button
                    variant={activeTab === 'batch' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('batch')}
                  >
                    <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                    Batch Prediction
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'single' ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modelInfo?.features?.map((feature: string) => (
                      <div key={feature}>
                        <label className="block text-muted-foreground text-sm mb-2 capitalize">
                          {feature.replace('_', ' ')}
                        </label>
                        <Input
                          type="text"
                          value={inputData[feature] || ''}
                          onChange={(e) => updateInputValue(feature, e.target.value)}
                          placeholder={`Enter ${feature}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="text-center mt-8">
                    <Button
                      onClick={makePrediction}
                      disabled={predicting || !allInputsFilled}
                      size="lg"
                    >
                      {predicting ? (
                        <>
                          <SparklesIcon className="w-5 h-5 mr-2 animate-spin" />
                          Predicting...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-5 h-5 mr-2" />
                          Generate Prediction
                        </>
                      )}
                    </Button>
                    {!allInputsFilled && (
                      <p className="text-muted-foreground text-sm mt-3">
                        Fill in all input fields to generate a prediction.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Upload CSV for Batch Predictions</h3>
                    <p className="text-muted-foreground text-sm">
                      Upload a CSV file with the same features as your training data
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <DocumentArrowUpIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="batch-file-input"
                    />
                    <label
                      htmlFor="batch-file-input"
                      className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {batchFile ? (
                        <div>
                          <p className="text-foreground font-medium">{batchFile.name}</p>
                          <p className="text-muted-foreground text-sm">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-foreground font-medium">Click to upload CSV file</p>
                          <p className="text-muted-foreground text-sm">or drag and drop</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {batchFile && (
                    <div className="text-center mt-6">
                      <Button
                        onClick={makeBatchPrediction}
                        disabled={predicting}
                        size="lg"
                      >
                        {predicting ? (
                          <>
                            <SparklesIcon className="w-5 h-5 mr-2 animate-spin" />
                            Processing Batch...
                          </>
                        ) : (
                          <>
                            <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
                            Generate Batch Predictions
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Results Display */}
          {activeTab === 'single' && prediction && (
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Prediction Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground mb-2 font-mono tabular-nums">
                    {prediction.prediction}
                  </div>
                  {typeof prediction.confidence === 'number' && (
                    <div className="text-muted-foreground mb-4">
                      Confidence:{' '}
                      <span className="font-mono tabular-nums text-foreground">
                        {(prediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {prediction.probabilities && Object.keys(prediction.probabilities).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-foreground font-medium">Class Probabilities:</h4>
                      {Object.entries(prediction.probabilities).map(([className, prob]) => (
                        <div key={className} className="flex justify-between items-center">
                          <span className="text-muted-foreground">{className}</span>
                          <span className="text-foreground font-mono tabular-nums">{(prob * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                  <Button asChild variant="outline">
                    <Link href={`/summary/${modelId}`}>Back to Model Summary</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/history">View Prediction History</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'batch' && batchResults && (
            <Card className="border border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Batch Prediction Results</CardTitle>
                  <Badge variant="success" className="font-mono tabular-nums">
                    {batchResults.count} predictions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-muted-foreground">
                      Successfully generated {batchResults.count} predictions
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {batchResults.predictions?.slice(0, 10).map((pred: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-elevated rounded-lg">
                          <span className="text-muted-foreground">Row <span className="font-mono tabular-nums">{index + 1}</span>:</span>
                          <div className="text-right">
                            <div className="text-foreground font-medium font-mono tabular-nums">{pred.prediction}</div>
                            {typeof pred.confidence === 'number' && (
                              <div className="text-muted-foreground text-sm">
                                <span className="font-mono tabular-nums">{(pred.confidence * 100).toFixed(1)}%</span> confidence
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {batchResults.predictions?.length > 10 && (
                        <div className="text-center text-muted-foreground text-sm mt-4">
                          ... and <span className="font-mono tabular-nums">{batchResults.predictions.length - 10}</span> more predictions
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <Button
                      onClick={() => {
                        const dataStr = JSON.stringify(batchResults, null, 2)
                        const dataBlob = new Blob([dataStr], { type: 'application/json' })
                        const url = URL.createObjectURL(dataBlob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `batch_predictions_${new Date().toISOString().split('T')[0]}.json`
                        link.click()
                        URL.revokeObjectURL(url)
                      }}
                      variant="outline"
                    >
                      <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                      Download Results
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/history">View Prediction History</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

export default function PredictPage({ params, searchParams }: {
  params: Promise<{ model: string }>
  searchParams?: Promise<{ model_id?: string; session_id?: string }>
}) {
  return (
    <ProtectedRoute>
      <PredictPageContent params={params} searchParams={searchParams} />
    </ProtectedRoute>
  )
}
