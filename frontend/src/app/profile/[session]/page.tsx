"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ArrowRightIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  EyeIcon,
  ChartPieIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { formatNumber, formatPercentage } from "@/lib/utils"
import { ComprehensiveDataAnalysis } from "@/components/ComprehensiveDataAnalysis"
import { SummaryModal } from "@/components/SummaryModal"
import { apiService } from "@/lib/api"
import PipelineStepper from "@/components/PipelineStepper"
import ErrorState from "@/components/ErrorState"
import PageSkeleton from "@/components/PageSkeleton"

interface ProfileData {
  session_id: string
  dataset_info: {
    rows: number
    columns: number
    memory_usage: string
    missing_values_total: number
    duplicate_rows: number
    file_size: string
  }
  column_profiles: Record<string, {
    type: string
    unique: number
    null_percentage: number
    mean?: number
    std?: number
    min?: number
    max?: number
    top_values?: Array<{ value: string; count: number }>
    outliers?: number[]
    skewness?: number
  }>
  correlations: Array<{
    column1: string
    column2: string
    correlation: number
  }>
  data_quality: {
    completeness: number
    duplicate_rows: number
    empty_columns: string[]
    constant_columns: string[]
    potential_leakage?: Array<{
      column: string
      issue: string
      severity: string
    }>
  }
  timestamp: string
}

export default function ProfilePage({ params }: { params: Promise<{ session: string }> }) {
  const resolvedParams = use(params)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean
    title: string
    summary: string
    insights: string[]
    dataQualityScore?: number
    type: 'dataset' | 'model'
  }>({
    isOpen: false,
    title: '',
    summary: '',
    insights: [],
    type: 'dataset'
  })

  useEffect(() => {
    loadProfileData(resolvedParams.session)
  }, [resolvedParams.session])

  const loadProfileData = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Call the backend API using authenticated service
      const data = await apiService.getDataProfile(sessionId)

      // Transform the data to match our interface
      const transformedData: ProfileData = {
        session_id: data.session_id,
        dataset_info: {
          rows: data.dataset_info.rows,
          columns: data.dataset_info.columns,
          memory_usage: data.dataset_info.memory_usage || 'N/A',
          missing_values_total: data.dataset_info.missing_values_total || 0,
          duplicate_rows: data.dataset_info.duplicate_rows || 0,
          file_size: data.dataset_info.file_size || 'N/A'
        },
        column_profiles: data.column_profiles || {},
        correlations: data.correlations?.significant_correlations || [],
        data_quality: {
          completeness: (data.data_quality?.completeness || 1) * 100, // Convert decimal to percentage
          duplicate_rows: data.data_quality?.duplicate_rows || 0,
          empty_columns: data.data_quality?.empty_columns || [],
          constant_columns: data.data_quality?.constant_columns || [],
          potential_leakage: data.data_quality?.potential_leakage || []
        },
        timestamp: data.timestamp
      }

      setProfileData(transformedData)
    } catch (err: any) {
      console.error('Error loading profile data:', err)
      const errorMessage = err.response?.data?.detail?.message || 'Failed to load data profile'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
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
      <div className="min-h-screen flex items-center justify-center">
        <ErrorState
          title="Analysis Failed"
          message={error}
          onRetry={() => loadProfileData(resolvedParams.session)}
          actions={[{ label: "Upload New File", href: "/upload" }]}
        />
      </div>
    )
  }

  if (!profileData) return null

  const qualityScore = Math.round(profileData.data_quality.completeness)
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-success'
    if (score >= 70) return 'text-warning'
    return 'text-destructive'
  }

  const getQualityVariant = (score: number) => {
    if (score >= 90) return 'success'
    if (score >= 70) return 'warning'
    return 'error'
  }

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation)
    if (abs >= 0.7) return 'bg-destructive'
    if (abs >= 0.5) return 'bg-warning'
    if (abs >= 0.3) return 'bg-warning'
    return 'bg-primary'
  }

  const getCorrelationIntensity = (correlation: number) => {
    const abs = Math.abs(correlation)
    return Math.max(0.2, abs) // Minimum opacity of 0.2
  }

  return (
    <div className="min-h-screen pt-20">
      <PipelineStepper current="profile" sessionId={resolvedParams.session} />

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Dataset Analysis
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive profiling and quality assessment of your data
              </p>
            </motion.div>
          </div>

          {/* Overview Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: 'Total Rows', 
                value: formatNumber(profileData.dataset_info.rows), 
                icon: '📊',
                description: 'Data points'
              },
              { 
                label: 'Columns', 
                value: profileData.dataset_info.columns.toString(), 
                icon: '📋',
                description: 'Features'
              },
              { 
                label: 'Memory Usage', 
                value: profileData.dataset_info.memory_usage, 
                icon: '💾',
                description: 'Storage size'
              },
              { 
                label: 'Data Quality', 
                value: `${qualityScore}%`, 
                icon: '✅', 
                color: getQualityColor(qualityScore),
                description: 'Completeness score'
              }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className={`text-2xl font-bold mb-1 font-mono tabular-nums ${item.color || 'text-foreground'}`}>
                      {item.value}
                    </div>
                    <div className="text-muted-foreground text-sm font-medium">{item.label}</div>
                    <div className="text-muted-foreground text-xs">{item.description}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Data Quality Score */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-primary" />
                  Data Quality Score
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Overall assessment of your dataset quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">Completeness</span>
                    <span className={`font-bold font-mono tabular-nums ${getQualityColor(qualityScore)}`}>
                      {formatPercentage(profileData.data_quality.completeness)}
                    </span>
                  </div>
                  <Progress
                    value={profileData.data_quality.completeness}
                    variant={getQualityVariant(qualityScore)}
                    className="h-3"
                  />
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div className="text-muted-foreground">
                      <strong className="text-foreground font-mono tabular-nums">{profileData.dataset_info.missing_values_total}</strong> missing values
                    </div>
                    <div className="text-muted-foreground">
                      <strong className="text-foreground font-mono tabular-nums">{profileData.dataset_info.duplicate_rows}</strong> duplicate rows
                    </div>
                    <div className="text-muted-foreground">
                      <strong className="text-foreground font-mono tabular-nums">{profileData.data_quality.constant_columns.length}</strong> constant columns
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Quality Issues */}
          {(profileData.data_quality.empty_columns.length > 0 ||
            profileData.data_quality.constant_columns.length > 0 ||
            profileData.dataset_info.duplicate_rows > 0 ||
            (profileData.data_quality.potential_leakage && profileData.data_quality.potential_leakage.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
              <Card className="border-warning/40 bg-warning/15">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-warning mr-2" />
                    Data Quality Issues
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Issues that may affect your analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profileData.dataset_info.duplicate_rows > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <div className="w-2 h-2 bg-warning rounded-full mr-3"></div>
                        <strong className="text-foreground font-mono tabular-nums mr-1">{profileData.dataset_info.duplicate_rows}</strong> duplicate rows found
                      </div>
                    )}
                    {profileData.data_quality.constant_columns.length > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <div className="w-2 h-2 bg-warning rounded-full mr-3"></div>
                        <strong className="text-foreground font-mono tabular-nums mr-1">{profileData.data_quality.constant_columns.length}</strong> constant columns: {profileData.data_quality.constant_columns.join(', ')}
                      </div>
                    )}
                    {profileData.data_quality.empty_columns.length > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <div className="w-2 h-2 bg-warning rounded-full mr-3"></div>
                        <strong className="text-foreground font-mono tabular-nums mr-1">{profileData.data_quality.empty_columns.length}</strong> empty columns: {profileData.data_quality.empty_columns.join(', ')}
                      </div>
                    )}
                    {profileData.data_quality.potential_leakage && profileData.data_quality.potential_leakage.length > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <div className="w-2 h-2 bg-destructive rounded-full mr-3"></div>
                        <strong className="text-foreground font-mono tabular-nums mr-1">{profileData.data_quality.potential_leakage.length}</strong> potential data leakage issues detected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Correlations */}
          {profileData.correlations && profileData.correlations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <ChartPieIcon className="w-5 h-5 mr-2 text-primary" />
                    Feature Correlations
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Significant correlations between numerical features (|r| &gt; 0.3)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profileData.correlations.map((corr, index) => (
                      <motion.div
                        key={`${corr.column1}-${corr.column2}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-elevated rounded-lg border border-border"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded ${getCorrelationColor(corr.correlation)}`}
                            style={{ opacity: getCorrelationIntensity(corr.correlation) }}
                          ></div>
                          <span className="text-foreground font-medium">
                            {corr.column1} ↔ {corr.column2}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold font-mono tabular-nums ${
                            Math.abs(corr.correlation) >= 0.7 ? 'text-destructive' :
                            Math.abs(corr.correlation) >= 0.5 ? 'text-warning' :
                            'text-primary'
                          }`}>
                            {corr.correlation.toFixed(3)}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {Math.abs(corr.correlation) >= 0.7 ? 'Strong' :
                             Math.abs(corr.correlation) >= 0.5 ? 'Moderate' : 'Weak'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {profileData.correlations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChartPieIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No significant correlations found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Comprehensive Data Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.87 }}
            className="mb-8"
          >
            <ComprehensiveDataAnalysis sessionId={resolvedParams.session} />
          </motion.div>

          {/* Column Profiles */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <EyeIcon className="w-5 h-5 mr-2 text-primary" />
                  Column Analysis
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Detailed profiling of each column in your dataset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(profileData.column_profiles).map(([column, profile]: [string, any]) => (
                    <motion.div
                      key={column}
                      className="p-4 bg-elevated rounded-lg border border-border hover:border-primary/40 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedColumn(selectedColumn === column ? null : column)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-foreground flex items-center">
                          {column}
                          {profile.null_percentage > 20 && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-warning ml-2" title="High missing values" />
                          )}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              profile.type === 'numerical' ? 'default' :
                              profile.type === 'categorical' ? 'success' :
                              profile.type === 'datetime' ? 'secondary' :
                              'outline'
                            }
                          >
                            {profile.type}
                          </Badge>
                          {profile.null_percentage === 0 && (
                            <CheckCircleIcon className="w-4 h-4 text-success" title="No missing values" />
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm mb-3">
                        <div className="text-muted-foreground">
                          <span className="text-foreground font-medium">Unique:</span> <span className="font-mono tabular-nums">{formatNumber(profile.unique)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="text-foreground font-medium">Missing:</span>
                          <span className={`ml-1 font-mono tabular-nums ${profile.null_percentage > 20 ? 'text-warning' : profile.null_percentage > 0 ? 'text-warning' : 'text-success'}`}>
                            {formatPercentage(profile.null_percentage)}
                          </span>
                        </div>
                        {profile.mean !== undefined && (
                          <div className="text-muted-foreground">
                            <span className="text-foreground font-medium">Mean:</span> <span className="font-mono tabular-nums">{profile.mean.toLocaleString()}</span>
                          </div>
                        )}
                        {profile.std !== undefined && (
                          <div className="text-muted-foreground">
                            <span className="text-foreground font-medium">Std Dev:</span> <span className="font-mono tabular-nums">{profile.std.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Missing values progress bar */}
                      {profile.null_percentage > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Completeness</span>
                            <span className="text-muted-foreground font-mono tabular-nums">{formatPercentage(100 - profile.null_percentage)}</span>
                          </div>
                          <Progress
                            value={100 - profile.null_percentage}
                            variant={profile.null_percentage > 20 ? 'error' : profile.null_percentage > 10 ? 'warning' : 'success'}
                            className="h-2"
                          />
                        </div>
                      )}

                      {selectedColumn === column && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-border"
                        >
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            {/* Numerical statistics */}
                            {profile.type === 'numerical' && (
                              <div className="space-y-2">
                                <h5 className="text-foreground font-medium mb-2">Statistical Summary</h5>
                                {profile.min !== undefined && (
                                  <div className="text-muted-foreground">
                                    <span className="text-foreground">Min:</span> <span className="font-mono tabular-nums">{profile.min.toLocaleString()}</span>
                                  </div>
                                )}
                                {profile.max !== undefined && (
                                  <div className="text-muted-foreground">
                                    <span className="text-foreground">Max:</span> <span className="font-mono tabular-nums">{profile.max.toLocaleString()}</span>
                                  </div>
                                )}
                                {profile.skewness !== undefined && (
                                  <div className="text-muted-foreground">
                                    <span className="text-foreground">Skewness:</span> <span className="font-mono tabular-nums">{profile.skewness.toFixed(3)}</span>
                                    <span className={`ml-2 text-xs ${
                                      Math.abs(profile.skewness) > 1 ? 'text-warning' : 'text-success'
                                    }`}>
                                      {Math.abs(profile.skewness) > 1 ? 'Highly skewed' : 'Normal'}
                                    </span>
                                  </div>
                                )}
                                {profile.outliers && profile.outliers.length > 0 && (
                                  <div className="text-muted-foreground">
                                    <span className="text-foreground">Outliers:</span> <span className="font-mono tabular-nums">{profile.outliers.length}</span> detected
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Categorical statistics — the backend returns top_values as a
                                { value: count } dict, so normalize to an array before rendering. */}
                            {profile.type === 'categorical' && profile.top_values && (() => {
                              const topValues = Array.isArray(profile.top_values)
                                ? (profile.top_values as Array<{ value: string; count: number }>)
                                : Object.entries(profile.top_values as Record<string, number>).map(
                                    ([value, count]) => ({ value, count: Number(count) })
                                  )
                              if (topValues.length === 0) return null
                              return (
                                <div className="space-y-2">
                                  <h5 className="text-foreground font-medium mb-2">Top Values</h5>
                                  {topValues.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-muted-foreground">
                                      <span className="text-foreground truncate">{String(item.value)}</span>
                                      <span className="font-mono tabular-nums">{Number(item.count).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* Data quality indicators */}
                            <div className="space-y-2">
                              <h5 className="text-foreground font-medium mb-2">Quality Indicators</h5>
                              <div className="text-muted-foreground">
                                <span className="text-foreground">Cardinality:</span>
                                <span className={`ml-2 text-xs ${
                                  profile.unique === profileData.dataset_info.rows ? 'text-primary' :
                                  profile.unique === 1 ? 'text-destructive' :
                                  profile.unique / profileData.dataset_info.rows > 0.9 ? 'text-warning' :
                                  'text-success'
                                }`}>
                                  {profile.unique === profileData.dataset_info.rows ? 'Unique ID' :
                                   profile.unique === 1 ? 'Constant' :
                                   profile.unique / profileData.dataset_info.rows > 0.9 ? 'High' : 'Normal'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dataset Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="mb-8"
          >
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-primary" />
                  AI Dataset Summary
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Get AI-powered insights about your dataset before training
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Button
                    onClick={async () => {
                      const loadingToast = toast.loading('Generating dataset summary...')
                      try {
                        const data = await apiService.getSessionSummary(resolvedParams.session)

                        setSummaryModal({
                          isOpen: true,
                          title: 'Dataset Analysis Summary',
                          summary: data.dataset_summary,
                          insights: data.dataset_insights?.recommendations || [],
                          dataQualityScore: data.data_quality_score,
                          type: 'dataset'
                        })

                        toast.dismiss(loadingToast)
                        toast.success('Dataset summary generated!')
                      } catch (err: any) {
                        console.error('Summary generation error:', err)
                        const errorMessage = err.response?.data?.detail?.message || 'Failed to generate dataset summary'
                        toast.dismiss(loadingToast)
                        toast.error(errorMessage)
                      }
                    }}
                    size="lg"
                  >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate Dataset Summary
                  </Button>
                  <p className="text-muted-foreground text-sm mt-2">
                    Powered by OpenRouter + DeepSeek
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col items-center gap-3"
          >
            <Button asChild size="xl">
              <Link href={`/train/${resolvedParams.session}/enhanced`}>
                <SparklesIcon className="w-5 h-5 mr-2" />
                Continue to training
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/train/${resolvedParams.session}`}>
                  Use basic training instead
                </Link>
              </Button>

              <Button asChild variant="ghost">
                <Link href="/upload">Back to Upload</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModal.isOpen}
        onClose={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
        title={summaryModal.title}
        summary={summaryModal.summary}
        insights={summaryModal.insights}
        dataQualityScore={summaryModal.dataQualityScore}
        type={summaryModal.type}
      />
    </div>
  )
}
