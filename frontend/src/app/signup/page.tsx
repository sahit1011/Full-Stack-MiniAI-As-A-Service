"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import {
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  SparklesIcon,
  UserPlusIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirmPassword: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { signup, login } = useAuth()
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear the inline error for this field as the user edits it
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  // Client-side checks mirror the backend rules (username >=3, valid email, password >=6)
  // so obvious problems surface instantly without a round-trip.
  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (formData.username.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address."
    }
    if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters long."
    }
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  // Map a backend error onto the right field(s): FastAPI 422 returns a list of
  // {loc, msg}; our 400s return a string detail ("Email already registered", etc.).
  const parseSignupError = (error: any): Record<string, string> => {
    const detail = error?.response?.data?.detail
    if (Array.isArray(detail)) {
      const out: Record<string, string> = {}
      for (const d of detail) {
        const field = Array.isArray(d.loc) ? String(d.loc[d.loc.length - 1]) : ""
        const msg = (d.msg || "Invalid value").replace(/^Value error,\s*/i, "")
        if (field && field in formData) out[field] = msg
        else out._general = msg
      }
      return out
    }
    if (typeof detail === "string") {
      if (/email/i.test(detail)) return { email: detail }
      if (/username/i.test(detail)) return { username: detail }
      return { _general: detail }
    }
    if (error?.message === "Network Error") {
      return { _general: "Can't reach the server — is the backend running?" }
    }
    return { _general: "Signup failed. Please try again." }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const { confirmPassword, ...signupData } = formData
      await signup(signupData)
      // Registered — auto-login with the same credentials and continue into the pipeline.
      const loggedIn = await login(signupData.username, signupData.password)
      router.push(loggedIn ? "/upload" : "/login")
    } catch (error) {
      const fieldErrors = parseSignupError(error)
      setErrors(fieldErrors)
      if (fieldErrors._general) toast.error(fieldErrors._general)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-elevated text-primary mb-4">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Join Klaro</h1>
          <p className="text-muted-foreground">Create your account to get started</p>
        </div>

        {/* Signup Form */}
        <Card className="border border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">Create Account</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errors._general && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive">
                  <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errors._general}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.username}
                    className={`pl-10 ${errors.username ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.username && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    {errors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.email}
                    className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-foreground">Full Name (Optional)</Label>
                <div className="relative">
                  <UserPlusIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.password && (
                  <p id="password-error" className="flex items-center gap-1.5 text-sm text-destructive">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    className={`pl-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="flex items-center gap-1.5 text-sm text-destructive">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Create Account
                    <ArrowRightIcon className="ml-2 w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
          >
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
