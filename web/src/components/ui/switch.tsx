import * as React from "react"
import { cn } from "../../lib/utils"

const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input type="checkbox" ref={ref} className={cn("h-5 w-9 appearance-none rounded-full bg-stone-200 checked:bg-stone-900 relative after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all checked:after:translate-x-4", className)} {...props} />
  )
)
Switch.displayName = "Switch"
export { Switch }
