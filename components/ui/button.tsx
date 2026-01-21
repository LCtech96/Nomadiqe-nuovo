import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 ease-out outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-200",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:brightness-110",
        destructive:
          "bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 hover:brightness-110",
        outline:
          "border border-gray-200/60 bg-white/98 backdrop-blur-sm shadow-sm shadow-gray-200/50 hover:bg-gray-50/50 hover:shadow-md hover:shadow-gray-300/50 hover:text-accent-foreground",
        secondary:
          "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-md shadow-gray-200/50 hover:shadow-lg hover:shadow-gray-300/50 hover:brightness-105",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground transition-opacity hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline transition-opacity hover:opacity-90",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded-2xl px-4 text-xs",
        lg: "h-12 rounded-2xl px-10 text-base",
        icon: "h-10 w-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }






