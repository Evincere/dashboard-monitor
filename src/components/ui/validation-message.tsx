"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const validationMessageVariants = cva(
  "flex items-center gap-2 text-sm font-medium animate-fade-in",
  {
    variants: {
      type: {
        error: "text-red-600 dark:text-red-400",
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
        info: "text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: {
      type: "error",
    },
  }
)

const iconVariants = cva("h-4 w-4 shrink-0", {
  variants: {
    type: {
      error: "text-red-500 dark:text-red-400",
      success: "text-green-500 dark:text-green-400",
      warning: "text-yellow-500 dark:text-yellow-400",
      info: "text-blue-500 dark:text-blue-400",
    },
  },
})

export interface ValidationMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof validationMessageVariants> {
  message?: string | undefined
  type?: "error" | "success" | "warning" | "info"
}

const ValidationMessage = React.forwardRef<
  HTMLDivElement,
  ValidationMessageProps
>(({ className, type = "error", message, ...props }, ref) => {
  if (!message) return null

  const Icon = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
  }[type]

  return (
    <div
      ref={ref}
      className={cn(validationMessageVariants({ type }), className)}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <Icon className={cn(iconVariants({ type }))} role="img" aria-hidden />
      <span>{message}</span>
    </div>
  )
})

ValidationMessage.displayName = "ValidationMessage"

export { ValidationMessage, validationMessageVariants }
