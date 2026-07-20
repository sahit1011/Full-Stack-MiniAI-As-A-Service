"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Immediate redirect without showing access denied screen
        router.replace('/login')
        return
      }

      if (requireAdmin && user && !user.is_admin) {
        router.replace('/')
        return
      }
    }
  }, [isAuthenticated, isLoading, user, requireAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-elevated">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Loading…</h2>
          <p className="text-sm text-muted-foreground">Checking authentication status</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render anything - redirect will happen in useEffect
  if (!isAuthenticated) {
    return null
  }

  if (requireAdmin && user && !user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Admin access required</h2>
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to access this page</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
