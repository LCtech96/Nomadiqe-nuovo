"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <ThemeProvider {...props}>{children}</ThemeProvider>
    </SessionProvider>
  )
}






