"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import ProtectedRoute from "@/components/ProtectedRoute"
import PipelineStepper from "@/components/PipelineStepper"
import { useAuth } from "@/contexts/AuthContext"
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { cn, formatBytes } from "@/lib/utils"
import { apiService } from "@/lib/api"

interface UploadResult {
  filename: string
  size: number
  rows: number
  columns: number
  session_id: string
  upload_timestamp: string
  data_schema: Record<string, any>
}

export default function UploadPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file')
      toast.error('Please upload a CSV file')
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      toast.error('File size must be less than 50MB')
      return
    }

    setError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload file to backend API using authenticated service
      const result = await apiService.uploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      console.log('Upload result:', result) // Debug log

      setUploadResult({
        filename: result.filename,
        size: result.file_size,
        rows: result.rows,
        columns: result.columns,
        session_id: result.session_id,
        upload_timestamp: result.upload_timestamp,
        data_schema: result.data_schema
      })

      toast.success('File uploaded successfully!')

    } catch (error: any) {
      console.error('Upload error:', error)
      const errorMessage = error.response?.data?.detail?.message || 'Upload failed. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  })

  const resetUpload = () => {
    setUploadResult(null)
    setError(null)
    setUploadProgress(0)
  }

  const downloadSampleCSV = async () => {
    setDownloading(true)
    // Create comprehensive sample data for ML demonstration
    const sampleData = [
      ['customer_id', 'age', 'income', 'category', 'purchase_amount', 'days_since_last_purchase', 'total_purchases', 'target_variable'],
      ['CUST_001', '25', '45000', 'Electronics', '299.99', '15', '8', 'High'],
      ['CUST_002', '34', '62000', 'Clothing', '89.50', '7', '12', 'Medium'],
      ['CUST_003', '28', '38000', 'Books', '24.99', '45', '3', 'Low'],
      ['CUST_004', '45', '85000', 'Electronics', '1299.99', '3', '25', 'High'],
      ['CUST_005', '31', '55000', 'Home', '199.99', '12', '15', 'Medium'],
      ['CUST_006', '22', '32000', 'Clothing', '45.00', '60', '2', 'Low'],
      ['CUST_007', '38', '72000', 'Electronics', '599.99', '8', '18', 'High'],
      ['CUST_008', '29', '48000', 'Books', '35.99', '30', '6', 'Low'],
      ['CUST_009', '42', '78000', 'Home', '899.99', '5', '22', 'High'],
      ['CUST_010', '26', '41000', 'Clothing', '125.50', '20', '9', 'Medium'],
      ['CUST_011', '35', '65000', 'Electronics', '449.99', '10', '14', 'Medium'],
      ['CUST_012', '30', '52000', 'Books', '89.99', '25', '7', 'Medium'],
      ['CUST_013', '27', '39000', 'Home', '75.00', '50', '4', 'Low'],
      ['CUST_014', '33', '58000', 'Clothing', '199.99', '14', '11', 'Medium'],
      ['CUST_015', '40', '82000', 'Electronics', '999.99', '6', '20', 'High'],
      ['CUST_016', '24', '36000', 'Books', '19.99', '90', '1', 'Low'],
      ['CUST_017', '37', '69000', 'Home', '450.00', '9', '16', 'High'],
      ['CUST_018', '32', '54000', 'Clothing', '75.99', '18', '10', 'Medium'],
      ['CUST_019', '29', '47000', 'Electronics', '199.99', '22', '8', 'Medium'],
      ['CUST_020', '44', '88000', 'Home', '1200.00', '4', '28', 'High'],
      ['CUST_021', '26', '43000', 'Books', '45.99', '35', '5', 'Low'],
      ['CUST_022', '39', '75000', 'Electronics', '799.99', '7', '19', 'High'],
      ['CUST_023', '31', '56000', 'Clothing', '150.00', '16', '13', 'Medium'],
      ['CUST_024', '28', '41000', 'Home', '89.99', '40', '6', 'Low'],
      ['CUST_025', '36', '67000', 'Electronics', '549.99', '11', '17', 'High']
    ]

    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))

      // Convert to CSV string
      const csvContent = sampleData.map(row => row.join(',')).join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'klaro_sample_data.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success('Sample CSV downloaded successfully! 🎉')
      } else {
        toast.error('Download not supported in this browser')
      }
    } catch (error) {
      toast.error('Failed to download sample CSV')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pt-20">
      <PipelineStepper current="upload" sessionId={uploadResult?.session_id} />
      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {!uploadResult ? (
              /* Upload Interface */
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Header */}
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
                      Upload Your Data
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Drop your CSV file and let our AI analyze it for insights
                    </p>
                  </motion.div>
                </div>

                {/* Upload Area */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div
                        {...getRootProps()}
                        className={cn(
                          "relative p-12 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer",
                          isDragActive && !isDragReject && "border-primary/40 bg-elevated",
                          isDragReject && "border-destructive/40 bg-destructive/15",
                          !isDragActive && "border-border hover:border-primary/40 hover:bg-elevated"
                        )}
                      >
                        <input {...getInputProps()} />

                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-6 bg-elevated text-primary rounded-lg flex items-center justify-center">
                            <CloudArrowUpIcon className="w-8 h-8" />
                          </div>

                          {isDragActive ? (
                            <div>
                              <h3 className="text-2xl font-bold text-foreground mb-2">
                                {isDragReject ? "Unsupported file type" : "Drop your file here"}
                              </h3>
                              <p className={isDragReject ? "text-destructive" : "text-muted-foreground"}>
                                {isDragReject ? "CSV files only" : "Release to upload your CSV file"}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-2xl font-bold text-foreground mb-2">
                                Drag & drop your CSV file
                              </h3>
                              <p className="text-muted-foreground mb-4">
                                or click to browse your files
                              </p>
                              <Button variant="outline">
                                Choose File
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* File Requirements */}
                        <div className="mt-8 pt-8 border-t border-border">
                          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 text-success mr-2" />
                              CSV files only
                            </div>
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 text-success mr-2" />
                              Max 50MB size
                            </div>
                            <div className="flex items-center">
                              <CheckCircleIcon className="w-4 h-4 text-success mr-2" />
                              Headers required
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Upload Progress */}
                      <AnimatePresence>
                        {uploading && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-6 border-t border-border"
                          >
                            <div className="flex items-center mb-4">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-6 h-6 mr-3"
                              >
                                <SparklesIcon className="w-6 h-6 text-primary" />
                              </motion.div>
                              <span className="text-foreground font-medium">
                                Uploading and analyzing your data...
                              </span>
                            </div>
                            <Progress value={uploadProgress} variant="default" className="h-2" />
                            <p className="text-muted-foreground text-sm mt-2 font-mono tabular-nums">
                              {uploadProgress}% complete
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-8 p-4 bg-destructive/15 border border-destructive/40 rounded-lg flex items-center"
                    >
                      <ExclamationTriangleIcon className="w-5 h-5 text-destructive mr-3" />
                      <span className="text-destructive">{error}</span>
                      <button
                        onClick={() => setError(null)}
                        className="ml-auto text-destructive hover:text-destructive/80"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sample Data Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-foreground">Need sample data?</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Download our demo customer dataset (25 rows, 8 columns) to test all features including data profiling, model training, and predictions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        onClick={downloadSampleCSV}
                        disabled={downloading}
                        className="group"
                      >
                        {downloading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 mr-2"
                            >
                              <SparklesIcon className="w-4 h-4" />
                            </motion.div>
                            Preparing...
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2 group-hover:translate-y-1 transition-transform" />
                            Download Sample CSV
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ) : (
              /* Upload Success */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="w-24 h-24 mx-auto mb-8 bg-elevated text-success rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-12 h-12" />
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">Upload Successful!</h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Your data has been processed and is ready for analysis
                </p>

                {/* File Info */}
                <Card className="mb-8 border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                      {uploadResult.filename}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{formatBytes(uploadResult.size)}</div>
                        <div className="text-muted-foreground text-sm">File Size</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{uploadResult.rows.toLocaleString()}</div>
                        <div className="text-muted-foreground text-sm">Rows</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground font-mono tabular-nums">{uploadResult.columns}</div>
                        <div className="text-muted-foreground text-sm">Columns</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success">✓</div>
                        <div className="text-muted-foreground text-sm">Validated</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detected Columns Preview */}
                {uploadResult.data_schema && Object.keys(uploadResult.data_schema).length > 0 && (
                  <Card className="mb-8 border border-border bg-card text-left">
                    <CardHeader>
                      <CardTitle className="text-foreground text-base">Detected columns</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        <span className="font-mono tabular-nums">{Object.keys(uploadResult.data_schema).length}</span> columns parsed from your file
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(uploadResult.data_schema).map(([name, info]) => {
                          const type =
                            info && typeof info === "object"
                              ? (info.dtype ?? info.type ?? info.data_type)
                              : info
                          return (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 text-sm"
                            >
                              <span className="font-mono text-foreground">{name}</span>
                              {type != null && (
                                <span className="font-mono text-xs text-muted-foreground">{String(type)}</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    asChild 
                    size="xl" 
                    className="group"
                  >
                    <Link href={`/profile/${uploadResult.session_id}`}>
                      Analyze Data
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="xl"
                    onClick={resetUpload}
                  >
                    Upload Another File
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      </div>
    </ProtectedRoute>
  )
}
