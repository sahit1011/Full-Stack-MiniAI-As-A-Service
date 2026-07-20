"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingProps {
  variant?: "default" | "dots" | "pulse" | "spin"
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function Loading({ 
  variant = "default", 
  size = "md", 
  className,
  text 
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "bg-primary rounded-full",
                size === "sm" ? "w-2 h-2" : size === "lg" ? "w-4 h-4" : "w-3 h-3"
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
        {text && (
          <p className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <motion.div
          className={cn(
            "bg-primary rounded-full",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {text && (
          <p className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    )
  }

  if (variant === "spin") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <motion.div
          className={cn(
            "border-2 border-border border-t-primary rounded-full",
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        {text && (
          <p className={cn("text-muted-foreground", textSizeClasses[size])}>
            {text}
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <motion.div
        className={cn(
          "bg-primary rounded-lg flex items-center justify-center",
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.div
          className="text-foreground font-bold"
          animate={{
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          ✨
        </motion.div>
      </motion.div>
      {text && (
        <p className={cn("text-muted-foreground", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  )
}

// Fullscreen loading overlay
export function LoadingOverlay({ 
  text = "Loading...", 
  variant = "default" 
}: { 
  text?: string
  variant?: LoadingProps["variant"]
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-card/90 backdrop-blur-md rounded-lg p-8 border border-border"
      >
        <Loading variant={variant} size="lg" text={text} />
      </motion.div>
    </motion.div>
  )
}

// Page loading component
export function PageLoading({ 
  title = "Loading", 
  subtitle = "Please wait while we prepare your content" 
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <Loading size="lg" className="mb-6" />
        <motion.h2 
          className="text-2xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        <motion.p 
          className="text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  )
}

// Skeleton loader
export function Skeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-elevated",
        className
      )}
      {...props}
    />
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}
