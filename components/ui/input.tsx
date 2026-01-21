import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-gray-200/60 bg-white/98 backdrop-blur-sm px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-transparent focus-visible:shadow-lg focus-visible:shadow-purple-200/50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }






