"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const email = searchParams.get("email") || ""

  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      // Auto-verify if token is present
      handleVerifyToken(token)
    }
  }, [searchParams])

  const handleVerifyToken = async (token: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      })

      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        })
      } else {
        // User is already authenticated and has password from signUp
        // No need to set password again
        toast({
          title: "Successo",
          description: "Email verificata con successo!",
        })
        router.push("/onboarding")
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la verifica",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: "email",
      })

      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        })
      } else {
        // User is already authenticated and has password from signUp
        // No need to set password again
        toast({
          title: "Successo",
          description: "Email verificata con successo!",
        })
        router.push("/onboarding")
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la verifica",
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
          <CardTitle className="text-2xl font-bold text-center">Verifica Email</CardTitle>
          <CardDescription className="text-center">
            Inserisci il codice a 6 cifre inviato alla tua email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Codice di verifica</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? "Verifica in corso..." : "Verifica"}
            </Button>
          </form>

          {email && (
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setResending(true)
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                      options: {
                        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
                      },
                    })

                    if (error) {
                      // Fallback: try signInWithOtp
                      const { error: otpError } = await supabase.auth.signInWithOtp({
                        email,
                        options: {
                          shouldCreateUser: false,
                          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
                        },
                      })

                      if (otpError) {
                        toast({
                          title: "Errore",
                          description: "Impossibile inviare il codice. Riprova più tardi.",
                          variant: "destructive",
                        })
                      } else {
                        toast({
                          title: "Successo",
                          description: "Codice di verifica reinviato!",
                        })
                      }
                    } else {
                      toast({
                        title: "Successo",
                        description: "Codice di verifica reinviato!",
                      })
                    }
                  } catch (error) {
                    toast({
                      title: "Errore",
                      description: "Si è verificato un errore",
                      variant: "destructive",
                    })
                  } finally {
                    setResending(false)
                  }
                }}
                disabled={resending}
                className="text-sm"
              >
                {resending ? "Invio in corso..." : "Rinvia il codice"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Verifica Email</CardTitle>
            <CardDescription className="text-center">
              Caricamento...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

