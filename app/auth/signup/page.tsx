"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // First, create the user with signUp (this sets the password)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      })

      if (signUpError) {
        toast({
          title: "Errore",
          description: signUpError.message,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // After signup, send OTP code for verification using resend
      // This will use the "Magic link" template which should show the OTP code
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      })

      if (resendError) {
        console.error("Resend OTP error:", resendError)
        // If resend fails, the user will receive the initial signup email
        toast({
          title: "Successo",
          description: "Account creato. Controlla la tua email per il codice di verifica.",
        })
      } else {
        toast({
          title: "Successo",
          description: "Controlla la tua email per il codice di verifica a 6 cifre",
        })
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la registrazione",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registrati su Nomadiqe</CardTitle>
          <CardDescription className="text-center">
            Crea il tuo account per iniziare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrazione in corso..." : "Registrati"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Hai già un account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

