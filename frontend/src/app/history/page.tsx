"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiService, FileHistoryItem, ModelHistoryItem, UserStats } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Brain,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Download,
  Sparkles,
  Target,
  Zap,
  Activity,
  Calendar,
  Award,
  Cpu
} from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function HistoryPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [files, setFiles] = useState<FileHistoryItem[]>([])
  const [models, setModels] = useState<ModelHistoryItem[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set())
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadHistoryData()
    }
  }, [isAuthenticated])

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        loadHistoryData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated])

  const loadHistoryData = async (showSuccessToast = false) => {
    try {
      setLoading(true)
      const [filesData, modelsData, statsData] = await Promise.all([
        apiService.getFileHistory({ limit: 50 }),
        apiService.getModelHistory({ limit: 50 }),
        apiService.getUserStats()
      ])

      setFiles(filesData)
      setModels(modelsData)
      setStats(statsData)
      setLastRefresh(new Date())

      if (showSuccessToast) {
        toast.success('History data refreshed successfully!')
      }
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Failed to load history data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'training':
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-warning" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variant = status.toLowerCase() === 'completed' || status.toLowerCase() === 'processed'
      ? 'success'
      : status.toLowerCase() === 'failed' || status.toLowerCase() === 'error'
      ? 'error'
      : 'secondary'

    return <Badge variant={variant}>{status}</Badge>
  }

  const handleDownloadModel = async (modelId: string, modelName: string) => {
    try {
      setDownloadingModels(prev => new Set(prev).add(modelId))
      await apiService.downloadModel(modelId)
      toast.success(`Model "${modelName}" downloaded successfully!`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download model. Please try again.')
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelId)
        return newSet
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please log in to view your history.</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Welcome back, <span className="text-primary">{user?.full_name || user?.username}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Your AI-powered data science journey continues. Explore your models, analyze your progress, and unlock new insights.
            </p>

            {/* Refresh Button */}
            <Button
              onClick={() => loadHistoryData(true)}
              disabled={loading}
              variant="outline"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>

            {/* Last Refresh Timestamp */}
            {lastRefresh && (
              <p className="text-sm text-muted-foreground mt-2 font-mono tabular-nums">
                Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              </p>
            )}
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <TabsList className="grid w-full grid-cols-4 border border-border bg-card rounded-lg p-2">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-elevated data-[state=active]:text-primary text-muted-foreground rounded-md transition-colors"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="data-[state=active]:bg-elevated data-[state=active]:text-primary text-muted-foreground rounded-md transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Files (<span className="font-mono tabular-nums">{files.length}</span>)
                </TabsTrigger>
                <TabsTrigger
                  value="models"
                  className="data-[state=active]:bg-elevated data-[state=active]:text-primary text-muted-foreground rounded-md transition-colors"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Models (<span className="font-mono tabular-nums">{models.length}</span>)
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="data-[state=active]:bg-elevated data-[state=active]:text-primary text-muted-foreground rounded-md transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Statistics
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Inline loading indicator — keep header/tabs visible during refresh */}
            {loading && (
              <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-sm">Loading your history...</span>
              </div>
            )}

            <TabsContent value="overview" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Files</CardTitle>
                    <div className="p-2 bg-elevated rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">{stats?.file_statistics.total_files || 0}</div>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(stats?.file_statistics.total_size_bytes || 0)} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Trained Models</CardTitle>
                    <div className="p-2 bg-elevated rounded-lg">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">{stats?.model_statistics.total_models || 0}</div>
                    <p className="text-sm text-muted-foreground">
                      Across {Object.keys(stats?.model_statistics.by_algorithm || {}).length} algorithms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Success Rate</CardTitle>
                    <div className="p-2 bg-elevated rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">
                      {stats ? Math.round(
                        ((stats.file_statistics.by_status?.processed || 0) /
                         Math.max(stats.file_statistics.total_files, 1)) * 100
                      ) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Files processed successfully
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.slice(0, 5).map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{file.original_filename}</p>
                        <p className="text-xs text-muted-foreground font-mono tabular-nums">
                          {file.num_rows} rows × {file.num_columns} columns
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.status)}
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                          {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No files uploaded yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Recent Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {models.slice(0, 5).map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{model.algorithm}</p>
                        <p className="text-xs text-muted-foreground">
                          {model.target_column} • {model.model_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(model.status)}
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                          {formatDistanceToNow(new Date(model.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {models.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No models trained yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Upload History</CardTitle>
              <CardDescription>
                All files you&apos;ve uploaded for analysis and model training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-elevated transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-elevated rounded-lg">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{file.original_filename}</h3>
                        <p className="text-sm text-muted-foreground font-mono tabular-nums">
                          {formatFileSize(file.file_size)} • {file.num_rows} rows × {file.num_columns} columns
                        </p>
                        <p className="text-xs text-muted-foreground font-mono tabular-nums">
                          Uploaded {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(file.status)}
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/profile/${file.session_id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No files uploaded yet</p>
                    <Button asChild className="mt-4">
                      <Link href="/upload">Upload Your First File</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="models" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-6 w-6 text-primary" />
                      Your AI Models Collection
                    </CardTitle>
                    <CardDescription>
                      Download, analyze, and manage your trained machine learning models
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <AnimatePresence>
                        {models.map((model, index) => (
                          <motion.div
                            key={model.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="p-6 border border-border rounded-lg bg-card hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-elevated rounded-lg">
                                  <Cpu className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground mb-1">{model.algorithm}</h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                    <span className="flex items-center gap-1">
                                      <Target className="h-4 w-4" />
                                      {model.target_column}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Award className="h-4 w-4" />
                                      {model.model_type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-mono tabular-nums">
                                      <Calendar className="h-3 w-3" />
                                      {formatDistanceToNow(new Date(model.created_at), { addSuffix: true })}
                                    </span>
                                    {model.training_duration && (
                                      <span className="flex items-center gap-1 font-mono tabular-nums">
                                        <Clock className="h-3 w-3" />
                                        {model.training_duration.toFixed(2)}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(model.status)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadModel(model.model_id, model.algorithm)}
                                  disabled={downloadingModels.has(model.model_id)}
                                >
                                  {downloadingModels.has(model.model_id) ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-4 h-4 mr-2"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                    </motion.div>
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  {downloadingModels.has(model.model_id) ? 'Downloading...' : 'Download'}
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/predict/${model.model_id}?model_id=${model.model_id}`}>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Predict
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {models.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center py-12"
                        >
                          <div className="w-24 h-24 mx-auto mb-6 bg-elevated rounded-lg flex items-center justify-center">
                            <Brain className="h-12 w-12 text-primary" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">No models trained yet</h3>
                          <p className="text-muted-foreground mb-6">Upload a dataset to train your first model</p>
                          <Button asChild>
                            <Link href="/upload">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Upload a dataset
                            </Link>
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      File Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Files:</span>
                      <span className="font-medium text-foreground font-mono tabular-nums">{stats.file_statistics.total_files}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Size:</span>
                      <span className="font-medium text-foreground font-mono tabular-nums">{formatFileSize(stats.file_statistics.total_size_bytes)}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">By Status:</p>
                      {Object.entries(stats.file_statistics.by_status).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span className="capitalize text-muted-foreground">{status}:</span>
                          <span className="text-foreground font-mono tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Model Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Models:</span>
                      <span className="font-medium text-foreground font-mono tabular-nums">{stats.model_statistics.total_models}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">By Algorithm:</p>
                      {Object.entries(stats.model_statistics.by_algorithm).map(([algorithm, count]) => (
                        <div key={algorithm} className="flex justify-between text-sm">
                          <span className="capitalize text-muted-foreground">{algorithm.replace('_', ' ')}:</span>
                          <span className="text-foreground font-mono tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">By Status:</p>
                      {Object.entries(stats.model_statistics.by_status).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-sm">
                          <span className="capitalize text-muted-foreground">{status}:</span>
                          <span className="text-foreground font-mono tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
