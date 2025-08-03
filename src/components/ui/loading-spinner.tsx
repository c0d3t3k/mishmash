"use client"

import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ className, size = "sm" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  return (
    <div className={cn("flex w-full h-full items-center justify-center", className)}>
      <svg
        className={cn(
          "animate-spin",
          sizeClasses[size]
        )}
        fill="none"
        viewBox="0 0 60 45"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="fill-black dark:fill-white"
          clipRule="evenodd"
          d="M0 0H15V45H0V0ZM45 0H60V45H45V0ZM20 0H40V15H20V0ZM20 30H40V45H20V30Z"
          fillRule="evenodd"
        />
      </svg>
    </div>
  )
}

// Full page loading component
export function LoadingPage() {
  return (
    <div className="flex items-center w-full h-full justify-center min-h-full">
      <LoadingSpinner size="lg" />
    </div>
  )
}

// Centered loading component for smaller areas
export function LoadingCenter() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner />
    </div>
  )
} 