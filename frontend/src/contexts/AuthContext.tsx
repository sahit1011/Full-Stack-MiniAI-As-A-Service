"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiService } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  full_name?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  signup: (userData: SignupData) => Promise<boolean>
  refreshUser: () => Promise<void>
}

interface SignupData {
  username: string
  email: string
  full_name?: string
  password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        if (storedToken) {
          setToken(storedToken)
          await fetchUserProfile(storedToken)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const fetchUserProfile = async (authToken: string) => {
    try {
      // Store token temporarily for API service
      localStorage.setItem('auth_token', authToken)
      const userData = await apiService.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      localStorage.removeItem('auth_token')
      setToken(null)
      setUser(null)
      throw error
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await apiService.login({ username, password })
      const newToken = data.access_token

      localStorage.setItem('auth_token', newToken)
      setToken(newToken)
      setUser(data.user)

      toast.success('Login successful!')
      return true
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please check your credentials.')
      return false
    }
  }

  const signup = async (userData: SignupData): Promise<boolean> => {
    // Let the caller (signup page) surface field-level backend errors — don't swallow them here.
    await apiService.signup({ ...userData, full_name: userData.full_name ?? '' })
    toast.success('Account created!')
    return true
  }

  const logout = () => {
    apiService.logout()
    setToken(null)
    setUser(null)
    // Clear all localStorage data to ensure clean logout
    localStorage.clear()
    toast.success('Logged out successfully')
    // Redirect to home page
    window.location.href = '/'
  }

  const refreshUser = async () => {
    if (token) {
      try {
        await fetchUserProfile(token)
      } catch (error) {
        console.error('Error refreshing user:', error)
        logout()
      }
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    signup,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
