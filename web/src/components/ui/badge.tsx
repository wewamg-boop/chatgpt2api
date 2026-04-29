import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "danger" | "info"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variant === "default" && "border-transparent bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
      variant === "secondary" && "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
      variant === "destructive" && "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
      variant === "outline" && "text-gray-900 border-gray-200 dark:text-gray-100 dark:border-gray-700",
      variant === "success" && "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
      variant === "warning" && "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
      variant === "danger" && "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
      variant === "info" && "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
      className
    )} {...props} />
  )
}
export { Badge }
