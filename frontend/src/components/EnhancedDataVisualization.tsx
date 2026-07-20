"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Cell,
  Scatter,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts"
import {
  ChartBarIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon
} from "@heroicons/react/24/outline"
// Statistical functions - simplified implementation
const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
const median = (arr: number[]) => {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const standardDeviation = (arr: number[]) => {
  const avg = mean(arr)
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}
const quantile = (arr: number[], q: number) => {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = q * (sorted.length - 1)
  if (Math.floor(index) === index) return sorted[index]
  const lower = sorted[Math.floor(index)]
  const upper = sorted[Math.ceil(index)]
  return lower + (upper - lower) * (index - Math.floor(index))
}

interface ColumnProfile {
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
  kurtosis?: number
  q1?: number
  q3?: number
  median?: number
}

interface DatasetInfo {
  rows: number
  columns: number
  memory_usage: string
  missing_values_total: number
  duplicate_rows: number
  file_size: string
}

interface Correlation {
  column1: string
  column2: string
  correlation: number
}

interface EnhancedDataVisualizationProps {
  columnProfiles: Record<string, ColumnProfile>
  correlations: Correlation[]
  datasetInfo: DatasetInfo
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

// Statistical analysis functions
const calculateStatistics = (values: number[]) => {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const meanVal = mean(values)
  const medianVal = median(values)
  const std = standardDeviation(values)
  const variance = std * std
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1

  // Simplified skewness calculation
  const skewness = (meanVal - medianVal) / std

  // Outlier detection using IQR method
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = values.filter(v => v < lowerBound || v > upperBound)

  // Normality assessment (simplified)
  const normalityScore = Math.max(0, 100 - Math.abs(skewness) * 20)

  return {
    mean: meanVal,
    median: medianVal,
    std,
    variance,
    skewness,
    q1,
    q3,
    iqr,
    outliers: outliers.length,
    normalityScore,
    coefficientOfVariation: (std / meanVal) * 100
  }
}

const getQualityColor = (score: number) => {
  if (score >= 90) return 'text-success'
  if (score >= 70) return 'text-warning'
  if (score >= 50) return 'text-warning'
  return 'text-destructive'
}

const getQualityBadge = (score: number) => {
  if (score >= 90) return { label: 'Excellent', color: 'bg-success text-success-foreground' }
  if (score >= 70) return { label: 'Good', color: 'bg-warning text-warning-foreground' }
  if (score >= 50) return { label: 'Fair', color: 'bg-warning text-warning-foreground' }
  return { label: 'Poor', color: 'bg-destructive text-destructive-foreground' }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function EnhancedDataVisualization({ columnProfiles, correlations, datasetInfo }: EnhancedDataVisualizationProps) {
  // Enhanced data processing
  const numericalColumns = Object.entries(columnProfiles)
    .filter(([_, profile]) => profile.type === 'numeric' && profile.mean !== undefined)
    .map(([column, profile]) => ({
      column,
      mean: profile.mean!,
      std: profile.std!,
      min: profile.min!,
      max: profile.max!,
      skewness: profile.skewness || 0,
      kurtosis: profile.kurtosis || 0,
      outliers: profile.outliers?.length || 0,
      nullPercentage: profile.null_percentage,
      unique: profile.unique
    }))

  const categoricalColumns = Object.entries(columnProfiles)
    .filter(([_, profile]) => profile.type === 'categorical')
    .map(([column, profile]) => ({
      column,
      unique: profile.unique,
      nullPercentage: profile.null_percentage,
      topValues: profile.top_values || []
    }))

  // Calculate overall data quality score
  const qualityMetrics = {
    completeness: 100 - (datasetInfo.missing_values_total / (datasetInfo.rows * datasetInfo.columns)) * 100,
    uniqueness: 100 - (datasetInfo.duplicate_rows / datasetInfo.rows) * 100,
    consistency: Object.values(columnProfiles).reduce((acc, profile) => 
      acc + (100 - profile.null_percentage), 0) / Object.keys(columnProfiles).length,
    validity: numericalColumns.length > 0 ? 
      numericalColumns.reduce((acc, col) => acc + Math.max(0, 100 - col.outliers * 2), 0) / numericalColumns.length : 100
  }

  const overallQualityScore = Math.round(
    (qualityMetrics.completeness * 0.3 + 
     qualityMetrics.uniqueness * 0.2 + 
     qualityMetrics.consistency * 0.3 + 
     qualityMetrics.validity * 0.2)
  )

  // Prepare data for visualizations
  const typeDistribution = Object.values(columnProfiles).reduce((acc, profile) => {
    const type = profile.type.charAt(0).toUpperCase() + profile.type.slice(1)
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeChartData = Object.entries(typeDistribution).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / Object.keys(columnProfiles).length) * 100).toFixed(1)
  }))

  const qualityData = [
    { metric: 'Completeness', value: qualityMetrics.completeness, color: CHART[0] },
    { metric: 'Uniqueness', value: qualityMetrics.uniqueness, color: CHART[1] },
    { metric: 'Consistency', value: qualityMetrics.consistency, color: CHART[2] },
    { metric: 'Validity', value: qualityMetrics.validity, color: CHART[3] }
  ]

  // Strong correlations (|r| &gt; 0.5)
  const strongCorrelations = correlations
    .filter(corr => Math.abs(corr.correlation) > 0.5)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 10)

  return (
    <div className="space-y-8">
      {/* Data Quality Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300">
                <SparklesIcon className="w-5 h-5" />
              </span>
              Data Quality Assessment
              <Badge className={`ml-3 ${getQualityBadge(overallQualityScore).color}`}>
                {getQualityBadge(overallQualityScore).label}
              </Badge>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Comprehensive analysis of your dataset's quality and characteristics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {qualityData.map((metric, index) => (
                <motion.div
                  key={metric.metric}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="mb-2">
                    <div className={`text-2xl font-bold font-mono tabular-nums ${getQualityColor(metric.value)}`}>
                      {metric.value.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">{metric.metric}</div>
                  </div>
                  <Progress
                    value={metric.value}
                    className="h-2 bg-elevated"
                  />
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <div className={`text-4xl font-bold font-mono tabular-nums mb-2 ${getQualityColor(overallQualityScore)}`}>
                {overallQualityScore}%
              </div>
              <div className="text-muted-foreground">Overall Data Quality Score</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Advanced Statistical Analysis Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enhanced Column Type Distribution with Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-border bg-card h-full">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 text-violet-300">
                  <ChartPieIcon className="w-4 h-4" />
                </span>
                Feature Type Analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Distribution and characteristics of data types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART[index % CHART.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      formatter={(value: number, name: string) => [
                        `${value} columns (${typeChartData.find(d => d.count === value)?.percentage}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {typeChartData.map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between p-2 border border-border bg-card rounded-lg">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: CHART[index % CHART.length] }}
                      />
                      <span className="text-foreground font-medium">{item.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground font-mono tabular-nums">{item.count} columns</div>
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Statistical Distribution Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-border bg-card h-full">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-emerald-300">
                  <BeakerIcon className="w-4 h-4" />
                </span>
                Statistical Properties
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Distribution characteristics of numerical features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {numericalColumns.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={numericalColumns.slice(0, 8)} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="column"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        formatter={(value: number, name: string) => [
                          name === 'skewness' ? value.toFixed(3) : value.toFixed(2),
                          name === 'skewness' ? 'Skewness' : name === 'outliers' ? 'Outliers' : 'Standard Deviation'
                        ]}
                      />
                      <Bar dataKey="std" fill={CHART[0]} name="std" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="skewness" stroke={CHART[2]} strokeWidth={2} dot={{ fill: CHART[2], r: 4 }} />
                      <Bar dataKey="outliers" fill={CHART[4]} name="outliers" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No numerical columns found</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Advanced Correlation Analysis */}
      {strongCorrelations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300">
                  <CpuChipIcon className="w-4 h-4" />
                </span>
                Feature Correlation Matrix
                <Badge className="ml-3 bg-elevated text-primary font-mono tabular-nums">{strongCorrelations.length} Strong</Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Significant relationships between numerical features (|r| &gt; 0.5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {strongCorrelations.map((corr, index) => {
                  const absCorr = Math.abs(corr.correlation)
                  const strength = absCorr > 0.8 ? 'Very Strong' : absCorr > 0.6 ? 'Strong' : 'Moderate'
                  const direction = corr.correlation > 0 ? 'Positive' : 'Negative'
                  const color = corr.correlation > 0 ? 'text-success' : 'text-destructive'

                  return (
                    <motion.div
                      key={`${corr.column1}-${corr.column2}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 border border-border bg-card rounded-lg hover:bg-elevated transition-colors duration-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-foreground font-medium">{corr.column1}</span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="text-foreground font-medium">{corr.column2}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={`${direction === 'Positive' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'} text-xs`}>
                            {direction}
                          </Badge>
                          <Badge className="bg-elevated text-primary text-xs">{strength}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold font-mono tabular-nums ${color}`}>
                          {corr.correlation.toFixed(3)}
                        </div>
                        <Progress
                          value={absCorr * 100}
                          className="w-20 h-2 bg-elevated"
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Quality Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/25 text-amber-300">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </span>
              Data Science Insights
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Professional analysis and recommendations for your dataset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Dataset Overview */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-foreground mb-3">Dataset Overview</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border border-border bg-card rounded-lg">
                    <span className="text-muted-foreground">Sample Size</span>
                    <span className="text-foreground font-medium font-mono tabular-nums">{formatNumber(datasetInfo.rows)} rows</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border bg-card rounded-lg">
                    <span className="text-muted-foreground">Feature Count</span>
                    <span className="text-foreground font-medium font-mono tabular-nums">{datasetInfo.columns} columns</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border bg-card rounded-lg">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="text-foreground font-medium font-mono tabular-nums">{datasetInfo.memory_usage}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border bg-card rounded-lg">
                    <span className="text-muted-foreground">Missing Values</span>
                    <span className={`font-medium font-mono tabular-nums ${datasetInfo.missing_values_total > 0 ? 'text-warning' : 'text-success'}`}>
                      {formatNumber(datasetInfo.missing_values_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-foreground mb-3">Recommendations</h4>
                <div className="space-y-3">
                  {overallQualityScore < 70 && (
                    <div className="p-3 border border-border bg-elevated rounded-lg">
                      <div className="flex items-center mb-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-warning mr-2" />
                        <span className="text-warning font-medium">Data Quality</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Consider data cleaning and preprocessing to improve quality score.
                      </p>
                    </div>
                  )}

                  {datasetInfo.missing_values_total > 0 && (
                    <div className="p-3 border border-border bg-elevated rounded-lg">
                      <div className="flex items-center mb-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-primary mr-2" />
                        <span className="text-primary font-medium">Missing Data</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Handle missing values using imputation or removal strategies.
                      </p>
                    </div>
                  )}

                  {numericalColumns.some(col => col.outliers > 0) && (
                    <div className="p-3 border border-border bg-elevated rounded-lg">
                      <div className="flex items-center mb-2">
                        <EyeIcon className="w-4 h-4 text-primary mr-2" />
                        <span className="text-primary font-medium">Outliers Detected</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Review outliers for data entry errors or genuine extreme values.
                      </p>
                    </div>
                  )}

                  {strongCorrelations.length > 0 && (
                    <div className="p-3 border border-border bg-elevated rounded-lg">
                      <div className="flex items-center mb-2">
                        <SparklesIcon className="w-4 h-4 text-success mr-2" />
                        <span className="text-success font-medium">Feature Engineering</span>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Strong correlations found - consider feature selection or dimensionality reduction.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
