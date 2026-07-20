"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  ChartBarIcon,
  ChartPieIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CalculatorIcon
} from "@heroicons/react/24/outline"
import React, { useState, useEffect } from "react"
import { apiService } from "@/lib/api"

interface ComprehensiveAnalysisProps {
  sessionId: string
}

interface AnalysisData {
  dataset_info: {
    shape: [number, number]
    rows: number
    columns: number
    memory_usage: string
    file_size: string
  }
  dtypes_info: {
    numeric_columns: string[]
    categorical_columns: string[]
    datetime_columns: string[]
    boolean_columns: string[]
  }
  missing_analysis: {
    total_missing: number
    missing_percentage: number
    columns_with_missing: Record<string, number>
    missing_patterns: any
  }
  duplicate_analysis: {
    duplicate_rows: number
    duplicate_percentage: number
    unique_rows: number
  }
  numeric_summary: {
    describe: Record<string, Record<string, number>>
    correlation_matrix: Record<string, Record<string, number>>
    skewness: Record<string, number>
    kurtosis: Record<string, number>
    outliers: Record<string, any>
  }
  categorical_summary: Record<string, {
    unique_count: number
    unique_percentage: number
    top_values: Record<string, number>
    mode: string
  }>
  quality_assessment: {
    completeness: number
    uniqueness: number
    consistency: number
    validity: number
    overall_quality: number
    quality_grade: string
  }
  distribution_analysis: Record<string, {
    mean: number
    median: number
    std: number
    min: number
    max: number
    skewness: number
    kurtosis: number
    quartiles: {
      q1: number
      q2: number
      q3: number
    }
    histogram_data: {
      counts: number[]
      bin_edges: number[]
      bin_centers: number[]
    }
    normality_test: {
      is_normal: boolean
      p_value: number
      test: string
    }
  }>
}

// Tokenized chart palette (chart-1=cyan, 2=green, 3=amber, 4=violet, 5=magenta, 6=blue)
const CHART = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))'
]

// Shared recharts tooltip styling
const tooltipContentStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))'
}
const tooltipItemStyle = { color: 'hsl(var(--foreground))' }
const tooltipLabelStyle = { color: 'hsl(var(--muted-foreground))' }

const getQualityColor = (grade: string) => {
  switch (grade.toLowerCase()) {
    case 'excellent': return 'text-success'
    case 'good': return 'text-success'
    case 'fair': return 'text-warning'
    case 'poor': return 'text-destructive'
    default: return 'text-muted-foreground'
  }
}

const getQualityBadgeColor = (grade: string) => {
  switch (grade.toLowerCase()) {
    case 'excellent': return 'bg-success'
    case 'good': return 'bg-success'
    case 'fair': return 'bg-warning'
    case 'poor': return 'bg-destructive'
    default: return 'bg-muted'
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

export function ComprehensiveDataAnalysis({ sessionId }: ComprehensiveAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    loadAnalysisData()
  }, [sessionId])

  const loadAnalysisData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiService.getComprehensiveAnalysis(sessionId)
      setAnalysisData(response.analysis)
    } catch (err: any) {
      console.error('Error loading analysis data:', err)
      setError(err.response?.data?.detail?.message || 'Failed to load analysis data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analyzing your data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border border-border bg-card">
        <CardContent className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header with Overall Quality Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground flex items-center text-2xl">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300 mr-3">
                    <SparklesIcon className="w-7 h-7" />
                  </span>
                  Data Analysis Report
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  Comprehensive statistical analysis of your dataset
                </CardDescription>
              </div>
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 font-mono tabular-nums ${getQualityColor(analysisData.quality_assessment.quality_grade)}`}>
                  {Math.round(analysisData.quality_assessment.overall_quality)}%
                </div>
                <Badge className={`${getQualityBadgeColor(analysisData.quality_assessment.quality_grade)} text-white px-4 py-1`}>
                  {analysisData.quality_assessment.quality_grade}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">
                  {formatNumber(analysisData.dataset_info.rows)}
                </div>
                <div className="text-muted-foreground text-sm">Rows</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">
                  {analysisData.dataset_info.columns}
                </div>
                <div className="text-muted-foreground text-sm">Columns</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">
                  {analysisData.dataset_info.memory_usage}
                </div>
                <div className="text-muted-foreground text-sm">Memory</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-1 font-mono tabular-nums">
                  {analysisData.dataset_info.file_size}
                </div>
                <div className="text-muted-foreground text-sm">File Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabbed Analysis Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 border border-border bg-card">
            <TabsTrigger value="overview" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Overview</TabsTrigger>
            <TabsTrigger value="quality" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Quality</TabsTrigger>
            <TabsTrigger value="distributions" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Distributions</TabsTrigger>
            <TabsTrigger value="correlations" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Correlations</TabsTrigger>
            <TabsTrigger value="categorical" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Categorical</TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-elevated data-[state=active]:text-primary">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Data Types Distribution */}
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300 mr-2">
                      <ChartPieIcon className="w-5 h-5" />
                    </span>
                    Data Types Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Numeric', value: analysisData.dtypes_info.numeric_columns.length },
                            { name: 'Categorical', value: analysisData.dtypes_info.categorical_columns.length },
                            { name: 'DateTime', value: analysisData.dtypes_info.datetime_columns.length },
                            { name: 'Boolean', value: analysisData.dtypes_info.boolean_columns.length }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Numeric', value: analysisData.dtypes_info.numeric_columns.length },
                            { name: 'Categorical', value: analysisData.dtypes_info.categorical_columns.length },
                            { name: 'DateTime', value: analysisData.dtypes_info.datetime_columns.length },
                            { name: 'Boolean', value: analysisData.dtypes_info.boolean_columns.length }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART[index % CHART.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipContentStyle}
                          itemStyle={tooltipItemStyle}
                          labelStyle={tooltipLabelStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-elevated rounded-lg">
                      <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{analysisData.dtypes_info.numeric_columns.length}</div>
                      <div className="text-sm text-muted-foreground">Numeric</div>
                    </div>
                    <div className="text-center p-3 bg-elevated rounded-lg">
                      <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{analysisData.dtypes_info.categorical_columns.length}</div>
                      <div className="text-sm text-muted-foreground">Categorical</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Missing Values Analysis */}
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/25 text-amber-300 mr-2">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                    </span>
                    Missing Values Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-warning mb-2 font-mono tabular-nums">
                        {analysisData.missing_analysis.missing_percentage.toFixed(1)}%
                      </div>
                      <div className="text-warning">Missing Data</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono tabular-nums">{formatNumber(analysisData.missing_analysis.total_missing)}</span> missing values
                      </div>
                    </div>

                    {Object.keys(analysisData.missing_analysis.columns_with_missing).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-foreground font-medium">Columns with Missing Values:</h4>
                        {Object.entries(analysisData.missing_analysis.columns_with_missing)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([column, count]) => (
                            <div key={column} className="flex justify-between items-center p-2 bg-elevated rounded">
                              <span className="text-muted-foreground text-sm truncate">{column}</span>
                              <span className="text-warning font-medium font-mono tabular-nums">{count}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dataset Summary Stats */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-blue-500/25 text-violet-300 mr-2">
                    <DocumentTextIcon className="w-5 h-5" />
                  </span>
                  Dataset Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Data Integrity</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Total Records</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{formatNumber(analysisData.dataset_info.rows)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Unique Records</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{formatNumber(analysisData.duplicate_analysis.unique_rows)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Duplicates</span>
                        <span className={`font-medium font-mono tabular-nums ${analysisData.duplicate_analysis.duplicate_rows > 0 ? 'text-warning' : 'text-success'}`}>
                          {formatNumber(analysisData.duplicate_analysis.duplicate_rows)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Column Types</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Numeric Columns</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{analysisData.dtypes_info.numeric_columns.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Categorical Columns</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{analysisData.dtypes_info.categorical_columns.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">DateTime Columns</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{analysisData.dtypes_info.datetime_columns.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Storage Info</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">Memory Usage</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{analysisData.dataset_info.memory_usage}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-elevated rounded-lg">
                        <span className="text-muted-foreground">File Size</span>
                        <span className="text-foreground font-medium font-mono tabular-nums">{analysisData.dataset_info.file_size}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-emerald-300 mr-2">
                      <CheckCircleIcon className="w-5 h-5" />
                    </span>
                    Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'Completeness', value: analysisData.quality_assessment.completeness },
                      { label: 'Uniqueness', value: analysisData.quality_assessment.uniqueness },
                      { label: 'Consistency', value: analysisData.quality_assessment.consistency },
                      { label: 'Validity', value: analysisData.quality_assessment.validity }
                    ].map((metric) => (
                      <div key={metric.label} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{metric.label}</span>
                          <span className="font-bold text-foreground font-mono tabular-nums">{metric.value.toFixed(1)}%</span>
                        </div>
                        <Progress value={metric.value} className="h-2 bg-elevated" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300 mr-2">
                      <InformationCircleIcon className="w-5 h-5" />
                    </span>
                    Quality Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className={`text-6xl font-bold mb-2 font-mono tabular-nums ${getQualityColor(analysisData.quality_assessment.quality_grade)}`}>
                      {Math.round(analysisData.quality_assessment.overall_quality)}%
                    </div>
                    <Badge className={`${getQualityBadgeColor(analysisData.quality_assessment.quality_grade)} text-white px-4 py-2`}>
                      {analysisData.quality_assessment.quality_grade} Quality
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {analysisData.quality_assessment.overall_quality >= 90 && (
                      <div className="p-3 bg-elevated border border-border rounded-lg">
                        <div className="flex items-center mb-2">
                          <CheckCircleIcon className="w-4 h-4 text-success mr-2" />
                          <span className="text-success font-medium">Excellent Quality</span>
                        </div>
                        <p className="text-muted-foreground text-sm">Your data is ready for analysis and modeling!</p>
                      </div>
                    )}

                    {analysisData.missing_analysis.missing_percentage > 10 && (
                      <div className="p-3 bg-elevated border border-border rounded-lg">
                        <div className="flex items-center mb-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-warning mr-2" />
                          <span className="text-warning font-medium">Missing Data Alert</span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          <span className="font-mono tabular-nums">{analysisData.missing_analysis.missing_percentage.toFixed(1)}%</span> missing values detected. Consider imputation strategies.
                        </p>
                      </div>
                    )}

                    {analysisData.duplicate_analysis.duplicate_percentage > 5 && (
                      <div className="p-3 bg-elevated border border-border rounded-lg">
                        <div className="flex items-center mb-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-warning mr-2" />
                          <span className="text-warning font-medium">Duplicate Records</span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          <span className="font-mono tabular-nums">{analysisData.duplicate_analysis.duplicate_percentage.toFixed(1)}%</span> duplicate rows found. Consider deduplication.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Distribution Analysis Tab */}
          <TabsContent value="distributions" className="space-y-6">
            {Object.keys(analysisData.distribution_analysis).length > 0 ? (
              <div className="grid gap-6">
                {Object.entries(analysisData.distribution_analysis).map(([column, distData]) => (
                  <Card key={column} className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300 mr-2">
                          <ChartBarIcon className="w-5 h-5" />
                        </span>
                        {column} - Distribution Analysis
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Statistical distribution and normality analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Histogram */}
                        <div>
                          <h4 className="text-foreground font-medium mb-3">Distribution Histogram</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={distData.histogram_data.bin_centers.map((center, idx) => ({
                                bin: center.toFixed(2),
                                count: distData.histogram_data.counts[idx],
                                frequency: ((distData.histogram_data.counts[idx] / distData.histogram_data.counts.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                              }))}>
                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="bin"
                                  stroke="hsl(var(--muted-foreground))"
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                                <Tooltip
                                  contentStyle={tooltipContentStyle}
                                  itemStyle={tooltipItemStyle}
                                  labelStyle={tooltipLabelStyle}
                                  formatter={(value, name) => [
                                    name === 'count' ? `${value} values` : `${value}%`,
                                    name === 'count' ? 'Count' : 'Frequency'
                                  ]}
                                />
                                <Bar dataKey="count" fill={CHART[0]} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Statistical Summary */}
                        <div>
                          <h4 className="text-foreground font-medium mb-3">Statistical Summary</h4>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Mean</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">{distData.mean.toFixed(3)}</div>
                              </div>
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Median</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">{distData.median.toFixed(3)}</div>
                              </div>
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Std Dev</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">{distData.std.toFixed(3)}</div>
                              </div>
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Range</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">{(distData.max - distData.min).toFixed(3)}</div>
                              </div>
                            </div>

                            {/* Quartiles */}
                            <div className="bg-elevated p-3 rounded-lg">
                              <div className="text-muted-foreground text-sm mb-2">Quartiles</div>
                              <div className="flex justify-between text-xs text-foreground font-mono tabular-nums">
                                <span>Q1: {distData.quartiles.q1.toFixed(2)}</span>
                                <span>Q2: {distData.quartiles.q2.toFixed(2)}</span>
                                <span>Q3: {distData.quartiles.q3.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Shape Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Skewness</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">
                                  {distData.skewness.toFixed(3)}
                                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                    Math.abs(distData.skewness) < 0.5 ? 'bg-success/15 text-success' :
                                    Math.abs(distData.skewness) < 1 ? 'bg-warning/15 text-warning' :
                                    'bg-destructive/15 text-destructive'
                                  }`}>
                                    {Math.abs(distData.skewness) < 0.5 ? 'Normal' :
                                     Math.abs(distData.skewness) < 1 ? 'Moderate' : 'High'}
                                  </span>
                                </div>
                              </div>
                              <div className="bg-elevated p-3 rounded-lg">
                                <div className="text-muted-foreground text-sm">Kurtosis</div>
                                <div className="text-foreground font-semibold font-mono tabular-nums">
                                  {distData.kurtosis.toFixed(3)}
                                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                    Math.abs(distData.kurtosis) < 3 ? 'bg-success/15 text-success' :
                                    'bg-warning/15 text-warning'
                                  }`}>
                                    {Math.abs(distData.kurtosis) < 3 ? 'Normal' : 'Heavy-tailed'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Normality Test */}
                            <div className="bg-elevated p-3 rounded-lg">
                              <div className="text-muted-foreground text-sm">Normality Test</div>
                              <div className="flex items-center justify-between">
                                <span className="text-foreground font-medium">
                                  {distData.normality_test.test === 'shapiro_wilk' ? 'Shapiro-Wilk' : 'Test Failed'}
                                </span>
                                <div className="flex items-center">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    distData.normality_test.is_normal
                                      ? 'bg-success/15 text-success'
                                      : 'bg-destructive/15 text-destructive'
                                  }`}>
                                    {distData.normality_test.is_normal ? 'Normal' : 'Non-normal'}
                                  </span>
                                  {distData.normality_test.p_value && (
                                    <span className="ml-2 text-xs text-muted-foreground font-mono tabular-nums">
                                      p = {distData.normality_test.p_value.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <CalculatorIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Numeric Columns</h3>
                  <p className="text-muted-foreground">No numeric columns found for distribution analysis</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Correlation Analysis Tab */}
          <TabsContent value="correlations" className="space-y-6">
            {analysisData.numeric_summary.correlation_matrix && Object.keys(analysisData.numeric_summary.correlation_matrix).length > 1 ? (
              <div className="space-y-6">
                {/* Correlation Heatmap */}
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-blue-500/25 text-violet-300 mr-2">
                        <CpuChipIcon className="w-5 h-5" />
                      </span>
                      Correlation Matrix Heatmap
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Pairwise correlations between numeric features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-max">
                        {(() => {
                          const corrMatrix = analysisData.numeric_summary.correlation_matrix;
                          const columns = Object.keys(corrMatrix);
                          return (
                            <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${columns.length}, 80px)` }}>
                              {/* Header row */}
                              <div></div>
                              {columns.map(col => (
                                <div key={col} className="text-xs text-muted-foreground p-2 text-center transform -rotate-45 origin-bottom-left">
                                  {col.length > 8 ? col.substring(0, 8) + '...' : col}
                                </div>
                              ))}

                              {/* Data rows */}
                              {columns.map(row => (
                                <React.Fragment key={row}>
                                  <div className="text-xs text-muted-foreground p-2 text-right pr-3">
                                    {row.length > 15 ? row.substring(0, 15) + '...' : row}
                                  </div>
                                  {columns.map(col => {
                                    const value = corrMatrix[row]?.[col] ?? 0;
                                    const absValue = Math.abs(value);
                                    // Diverging scale: positive -> chart-3 (warm), negative -> chart-6 (blue),
                                    // diagonal -> chart-4 (violet), weak -> border. Strength via opacity.
                                    const getCellStyle = (): React.CSSProperties => {
                                      if (row === col) return { backgroundColor: 'hsl(var(--chart-4))' };
                                      if (absValue < 0.2) return { backgroundColor: 'hsl(var(--border))' };
                                      const hue = value > 0 ? 'var(--chart-3)' : 'var(--chart-6)';
                                      const opacity =
                                        absValue >= 0.8 ? 0.9 :
                                        absValue >= 0.6 ? 0.7 :
                                        absValue >= 0.4 ? 0.5 : 0.3;
                                      return { backgroundColor: `hsl(${hue} / ${opacity})` };
                                    };

                                    return (
                                      <div
                                        key={`${row}-${col}`}
                                        className="h-12 w-full flex items-center justify-center text-xs font-medium font-mono tabular-nums text-foreground rounded"
                                        style={getCellStyle()}
                                        title={`${row} vs ${col}: ${value.toFixed(3)}`}
                                      >
                                        {value.toFixed(2)}
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-3) / 0.9)' }}></div>
                        <span className="text-muted-foreground">Strong Positive</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-3) / 0.5)' }}></div>
                        <span className="text-muted-foreground">Moderate Positive</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--border))' }}></div>
                        <span className="text-muted-foreground">Weak</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-6) / 0.5)' }}></div>
                        <span className="text-muted-foreground">Moderate Negative</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-6) / 0.9)' }}></div>
                        <span className="text-muted-foreground">Strong Negative</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Strong Correlations List */}
                {(() => {
                  const corrMatrix = analysisData.numeric_summary.correlation_matrix;
                  const strongCorrelations = [];
                  const columns = Object.keys(corrMatrix);

                  for (let i = 0; i < columns.length; i++) {
                    for (let j = i + 1; j < columns.length; j++) {
                      const col1 = columns[i];
                      const col2 = columns[j];
                      const value = corrMatrix[col1]?.[col2];
                      if (value && Math.abs(value) > 0.5) {
                        strongCorrelations.push({
                          col1,
                          col2,
                          correlation: value,
                          strength: Math.abs(value) >= 0.8 ? 'Very Strong' :
                                   Math.abs(value) >= 0.6 ? 'Strong' : 'Moderate'
                        });
                      }
                    }
                  }

                  strongCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

                  return strongCorrelations.length > 0 ? (
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300 mr-2">
                            <ChartPieIcon className="w-5 h-5" />
                          </span>
                          Strong Correlations (|r| &gt; 0.5)
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Feature pairs with significant correlations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {strongCorrelations.slice(0, 10).map((corr, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-elevated rounded-lg">
                              <div className="flex-1">
                                <div className="text-foreground font-medium">
                                  {corr.col1} ↔ {corr.col2}
                                </div>
                                <div className="text-muted-foreground text-sm">{corr.strength} correlation</div>
                              </div>
                              <div className="text-right">
                                <div
                                  className="text-lg font-bold font-mono tabular-nums"
                                  style={{ color: corr.correlation > 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-6))' }}
                                >
                                  {corr.correlation.toFixed(3)}
                                </div>
                                <div className="w-20 rounded-full h-2" style={{ backgroundColor: 'hsl(var(--border))' }}>
                                  <div
                                    className="h-2 rounded-full"
                                    style={{
                                      width: `${Math.abs(corr.correlation) * 100}%`,
                                      backgroundColor: corr.correlation > 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-6))'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}
              </div>
            ) : (
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <CpuChipIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Insufficient Numeric Data</h3>
                  <p className="text-muted-foreground">Need at least 2 numeric columns for correlation analysis</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Categorical Analysis Tab */}
          <TabsContent value="categorical" className="space-y-6">
            {Object.keys(analysisData.categorical_summary).length > 0 ? (
              <div className="grid gap-6">
                {Object.entries(analysisData.categorical_summary).map(([column, catData]) => (
                  <Card key={column} className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-emerald-300 mr-2">
                          <ChartBarIcon className="w-5 h-5" />
                        </span>
                        {column} - Categorical Analysis
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Value distribution and frequency analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Value Distribution Chart */}
                        <div>
                          <h4 className="text-foreground font-medium mb-3">Top Values Distribution</h4>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={Object.entries(catData.top_values).map(([value, count]) => ({
                                  value: value.length > 15 ? value.substring(0, 15) + '...' : value,
                                  fullValue: value,
                                  count: count,
                                  percentage: ((count / Object.values(catData.top_values).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                                }))}
                                layout="horizontal"
                              >
                                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  type="number"
                                  stroke="hsl(var(--muted-foreground))"
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="value"
                                  stroke="hsl(var(--muted-foreground))"
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                  width={100}
                                />
                                <Tooltip
                                  contentStyle={tooltipContentStyle}
                                  itemStyle={tooltipItemStyle}
                                  labelStyle={tooltipLabelStyle}
                                  formatter={(value, name, props) => [
                                    `${value} occurrences (${props.payload.percentage}%)`,
                                    props.payload.fullValue
                                  ]}
                                />
                                <Bar dataKey="count" fill={CHART[1]} radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Statistics Summary */}
                        <div>
                          <h4 className="text-foreground font-medium mb-3">Category Statistics</h4>
                          <div className="space-y-4">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-elevated p-4 rounded-lg">
                                <div className="text-muted-foreground text-sm">Unique Values</div>
                                <div className="text-foreground text-2xl font-bold font-mono tabular-nums">{catData.unique_count}</div>
                                <div className="text-muted-foreground text-xs">
                                  <span className="font-mono tabular-nums">{catData.unique_percentage.toFixed(1)}%</span> of total
                                </div>
                              </div>
                              <div className="bg-elevated p-4 rounded-lg">
                                <div className="text-muted-foreground text-sm">Most Frequent</div>
                                <div className="text-foreground text-lg font-semibold truncate" title={catData.mode}>
                                  {catData.mode || 'N/A'}
                                </div>
                                <div className="text-muted-foreground text-xs">Mode value</div>
                              </div>
                            </div>

                            {/* Cardinality Assessment */}
                            <div className="bg-elevated p-4 rounded-lg">
                              <div className="text-muted-foreground text-sm mb-2">Cardinality Assessment</div>
                              <div className="flex items-center justify-between">
                                <span className="text-foreground font-medium">
                                  {catData.unique_percentage > 90 ? 'Very High' :
                                   catData.unique_percentage > 50 ? 'High' :
                                   catData.unique_percentage > 20 ? 'Medium' : 'Low'}
                                </span>
                                <span className={`px-3 py-1 rounded text-xs ${
                                  catData.unique_percentage > 90 ? 'bg-destructive/15 text-destructive' :
                                  catData.unique_percentage > 50 ? 'bg-warning/15 text-warning' :
                                  catData.unique_percentage > 20 ? 'bg-primary/15 text-primary' :
                                  'bg-success/15 text-success'
                                }`}>
                                  {catData.unique_percentage > 90 ? 'Consider ID column' :
                                   catData.unique_percentage > 50 ? 'High diversity' :
                                   catData.unique_percentage > 20 ? 'Good for analysis' : 'Low diversity'}
                                </span>
                              </div>
                            </div>

                            {/* Top Values List */}
                            <div className="bg-elevated p-4 rounded-lg">
                              <div className="text-muted-foreground text-sm mb-3">Top Values Breakdown</div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {Object.entries(catData.top_values).slice(0, 5).map(([value, count]) => {
                                  const total = Object.values(catData.top_values).reduce((a, b) => a + b, 0);
                                  const percentage = ((count / total) * 100).toFixed(1);
                                  return (
                                    <div key={value} className="flex items-center justify-between text-sm">
                                      <span className="text-foreground truncate flex-1 mr-2" title={value}>
                                        {value.length > 20 ? value.substring(0, 20) + '...' : value}
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-muted-foreground font-mono tabular-nums">{count}</span>
                                        <span className="text-muted-foreground text-xs font-mono tabular-nums">({percentage}%)</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <ChartBarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Categorical Columns</h3>
                  <p className="text-muted-foreground">No categorical columns found for analysis</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights">
            <Card className="border border-border bg-card">
              <CardContent className="p-6 text-center">
                <MagnifyingGlassIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Insights</h3>
                <p className="text-muted-foreground">Coming soon - AI-powered data insights</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
