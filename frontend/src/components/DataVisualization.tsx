"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AreaChart
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
  EyeIcon
} from "@heroicons/react/24/outline"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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
}

interface DataVisualizationProps {
  columnProfiles: Record<string, ColumnProfile>
  correlations: Array<{
    column1: string
    column2: string
    correlation: number
  }>
  datasetInfo: {
    rows: number
    columns: number
    missing_values_total: number
    duplicate_rows: number
  }
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
const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))'
  },
  itemStyle: { color: 'hsl(var(--foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))' }
}

const getQualityColor = (score: number) => {
  if (score >= 70) return 'text-success'
  if (score >= 50) return 'text-warning'
  return 'text-destructive'
}

const getQualityBadge = (score: number) => {
  if (score >= 70) return { label: score >= 90 ? 'Excellent' : 'Good', color: 'bg-success text-success-foreground' }
  if (score >= 50) return { label: 'Fair', color: 'bg-warning text-warning-foreground' }
  return { label: 'Poor', color: 'bg-destructive text-destructive-foreground' }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function DataVisualization({ columnProfiles, correlations, datasetInfo }: DataVisualizationProps) {
  // Prepare data for column type distribution
  const columnTypeData = Object.values(columnProfiles).reduce((acc, profile) => {
    const type = profile.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeChartData = Object.entries(columnTypeData).map(([type, count]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count,
    percentage: ((count / Object.keys(columnProfiles).length) * 100).toFixed(1)
  }))

  // Enhanced data quality analysis
  const numericalColumns = Object.entries(columnProfiles)
    .filter(([_, profile]) => profile.type === 'numeric' && profile.mean !== undefined)
    .map(([column, profile]) => ({
      column,
      mean: profile.mean!,
      std: profile.std!,
      min: profile.min!,
      max: profile.max!,
      skewness: profile.skewness || 0,
      outliers: profile.outliers?.length || 0,
      nullPercentage: profile.null_percentage,
      unique: profile.unique
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

  // Strong correlations (|r| &gt; 0.5)
  const strongCorrelations = correlations
    .filter(corr => Math.abs(corr.correlation) > 0.5)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 8)

  // Prepare data for missing values chart
  const missingValuesData = Object.entries(columnProfiles)
    .filter(([_, profile]) => profile.null_percentage > 0)
    .map(([column, profile]) => ({
      column: column.length > 15 ? column.substring(0, 15) + '...' : column,
      fullColumn: column,
      missing_percentage: profile.null_percentage,
      completeness: 100 - profile.null_percentage
    }))
    .sort((a, b) => b.missing_percentage - a.missing_percentage)
    .slice(0, 10) // Top 10 columns with missing values

  // Prepare data for correlation heatmap (simplified) - using existing strongCorrelations

  // Data quality overview
  const qualityData = [
    {
      metric: 'Complete Data',
      value: ((datasetInfo.rows * Object.keys(columnProfiles).length - datasetInfo.missing_values_total) /
              (datasetInfo.rows * Object.keys(columnProfiles).length) * 100),
      color: CHART[1]
    },
    {
      metric: 'Missing Data',
      value: (datasetInfo.missing_values_total /
              (datasetInfo.rows * Object.keys(columnProfiles).length) * 100),
      color: CHART[4]
    },
    {
      metric: 'Unique Rows',
      value: ((datasetInfo.rows - datasetInfo.duplicate_rows) / datasetInfo.rows * 100),
      color: CHART[0]
    },
    {
      metric: 'Duplicate Rows',
      value: (datasetInfo.duplicate_rows / datasetInfo.rows * 100),
      color: CHART[2]
    }
  ]

  // Numerical columns for chart display (using existing numericalColumns)
  const numericalColumnsChart = numericalColumns.map(col => ({
    column: col.column.length > 12 ? col.column.substring(0, 12) + '...' : col.column,
    fullColumn: col.column,
    mean: col.mean,
    std: col.std,
    skewness: Math.abs(col.skewness)
  })).slice(0, 8)

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
              <span className="w-9 h-9 mr-3 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300">
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
              {[
                { metric: 'Completeness', value: qualityMetrics.completeness },
                { metric: 'Uniqueness', value: qualityMetrics.uniqueness },
                { metric: 'Consistency', value: qualityMetrics.consistency },
                { metric: 'Validity', value: qualityMetrics.validity }
              ].map((metric, index) => (
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

      {/* Charts Grid - 2 per row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Column Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-border bg-card h-full">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 text-violet-300">
                  <ChartPieIcon className="w-5 h-5" />
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
                      {...TOOLTIP_STYLE}
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

        {/* Data Quality Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-border bg-card h-full">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300">
                  <ChartBarIcon className="w-5 h-5" />
                </span>
                Data Quality
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Completeness metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="metric"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']}
                    />
                    <Bar dataKey="value" fill={CHART[0]} radius={[4, 4, 0, 0]}>
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row - Missing Values and Numerical Stats */}
      {(missingValuesData.length > 0 || numericalColumns.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Missing Values Analysis */}
          {missingValuesData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border border-border bg-card h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-orange-500/25 text-amber-300">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                    </span>
                    Missing Values
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Columns needing attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={missingValuesData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="column"
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === 'missing_percentage' ? 'Missing' : 'Complete'
                          ]}
                          labelFormatter={(label) => {
                            const item = missingValuesData.find(d => d.column === label)
                            return item ? item.fullColumn : label
                          }}
                        />
                        <Bar dataKey="missing_percentage" fill={CHART[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Numerical Columns Statistics */}
          {numericalColumns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border border-border bg-card h-full">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/25 to-teal-500/25 text-emerald-300">
                      <ChartBarIcon className="w-5 h-5" />
                    </span>
                    Numerical Stats
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Statistical distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={numericalColumnsChart} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="column"
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(),
                            name === 'mean' ? 'Mean' : name === 'std' ? 'Std Dev' : 'Skewness'
                          ]}
                          labelFormatter={(label) => {
                            const item = numericalColumns.find(d => d.column === label)
                            return item ? item.column : label
                          }}
                        />
                        <Bar dataKey="mean" fill={CHART[1]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Strong Correlations */}
      {strongCorrelations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 text-violet-300">
                  <ChartPieIcon className="w-5 h-5" />
                </span>
                Strong Feature Correlations
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Significant correlations between features (|r| &gt; 0.5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strongCorrelations.map((corr, index) => {
                  const absCorr = Math.abs(corr.correlation)
                  const getColor = () => {
                    if (absCorr >= 0.8) return CHART[4] // Very Strong - magenta
                    if (absCorr >= 0.7) return CHART[2] // Strong - amber
                    return CHART[0] // Moderate - cyan
                  }

                  const getIntensity = () => {
                    return `${Math.max(20, absCorr * 100)}%`
                  }

                  return (
                    <motion.div
                      key={`${corr.column1}-${corr.column2}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-4 border border-border bg-elevated rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-6 h-6 rounded"
                          style={{
                            backgroundColor: getColor(),
                            opacity: getIntensity()
                          }}
                        ></div>
                        <div>
                          <div className="text-foreground font-medium">
                            {corr.column1} ↔ {corr.column2}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {absCorr >= 0.8 ? 'Very Strong' :
                             absCorr >= 0.7 ? 'Strong' :
                             absCorr >= 0.5 ? 'Moderate' : 'Weak'} correlation
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                          {corr.correlation.toFixed(3)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {corr.correlation > 0 ? 'Positive' : 'Negative'}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Science Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <span className="w-8 h-8 mr-2 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-300">
                <MagnifyingGlassIcon className="w-5 h-5" />
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
                  <div className="flex justify-between items-center p-3 border border-border bg-elevated rounded-lg">
                    <span className="text-muted-foreground">Sample Size</span>
                    <span className="text-foreground font-medium font-mono tabular-nums">{formatNumber(datasetInfo.rows)} rows</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border bg-elevated rounded-lg">
                    <span className="text-muted-foreground">Feature Count</span>
                    <span className="text-foreground font-medium font-mono tabular-nums">{datasetInfo.columns} columns</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border bg-elevated rounded-lg">
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
                        <span className="text-foreground font-medium">Outliers Detected</span>
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
