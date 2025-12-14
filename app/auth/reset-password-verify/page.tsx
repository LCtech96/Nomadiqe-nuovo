"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

function ResetPasswordVerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const email = searchParams.get("email") || ""
  const [tokenVerified, setTokenVerified] = useState(false)
  const [userEmail, setUserEmail] = useState(email)

  useEffect(() => {
    const token = searchParams.get("token")
    const type = searchParams.get("type")
    
    if (token) {
      // Auto-verify if token is present (from email link)
      handleVerifyToken(token, type)
    }
  }, [searchParams])

  const handleVerifyToken = async (token: string, type: string | null = null) => {
    setLoading(true)
    try {
      // Verifica il token dal link email
      // Il token può essere passato come hash o come codice
      const { error, data } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type === "recovery" ? "recovery" : "email",
      })

      if (error) {
        // Se il token_hash non funziona, prova con token normale
        // Solo se abbiamo l'email, la passiamo
        const verifyParams: any = {
          token: token,
          type: type === "recovery" ? "recovery" : "email",
        }
        if (email) {
          verifyParams.email = email
        }
        const { error: tokenError, data: tokenData } = await supabase.auth.verifyOtp(verifyParams)

        if (tokenError) {
          toast({
            title: "Errore",
            description: tokenError.message || "Token non valido o scaduto",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        // Token verificato con successo
        if (tokenData?.user?.email) {
          setUserEmail(tokenData.user.email)
          setTokenVerified(true)
          toast({
            title: "Verifica completata",
            description: "Ora puoi inserire la tua nuova password",
          })
        }
      } else {
        // Token hash verificato con successo
        if (data?.user?.email) {
          setUserEmail(data.user.email)
          setTokenVerified(true)
          toast({
            title: "Verifica completata",
            description: "Ora puoi inserire la tua nuova password",
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore durante la verifica",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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
      // Se il token è già stato verificato dal link, salta la verifica del codice
      let shouldUpdatePassword = tokenVerified
      
      if (!tokenVerified && code) {
        // Verifica il codice OTP inserito manualmente
        const { error: verifyError, data: verifyData } = await supabase.auth.verifyOtp({
          email: email || userEmail,
          token: code,
          type: "email",
        })

        if (verifyError) {
          toast({
            title: "Errore",
            description: verifyError.message || "Codice non valido o scaduto",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        // Se il codice è valido, l'utente è autenticato temporaneamente
        if (!verifyData?.user) {
          toast({
            title: "Errore",
            description: "Impossibile verificare il codice. Riprova.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        
        shouldUpdatePassword = true
        if (verifyData.user.email) {
          setUserEmail(verifyData.user.email)
        }
      }

      // Aggiorna la password
      if (!shouldUpdatePassword) {
        toast({
          title: "Errore",
          description: "Devi verificare il codice o usare il link dall'email",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        toast({
          title: "Errore",
          description: updateError.message || "Errore durante l'aggiornamento della password",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      toast({
        title: "Password aggiornata!",
        description: "La tua password è stata reimpostata con successo. Ora puoi accedere con la nuova password.",
      })

      // Reindirizza al login
      router.push("/auth/signin")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Errore",
        description: "Email non disponibile",
        variant: "destructive",
      })
      return
    }

    setResending(true)
    try {
      // Invia nuovamente il codice OTP usando signInWithOtp
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/reset-password-verify?email=${encodeURIComponent(email)}`,
        },
      })

      if (error) {
        let errorMessage = "Impossibile inviare il codice"
        if (error.message?.includes("email rate limit")) {
          errorMessage = "Troppi tentativi. Aspetta qualche minuto prima di riprovare."
        } else if (error.message?.includes("SMTP") || error.message?.includes("email")) {
          errorMessage = "Errore di configurazione email. Verifica che SMTP sia configurato correttamente su Supabase."
        } else {
          errorMessage = error.message || errorMessage
        }
        
        toast({
          title: "Errore",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Successo",
          description: "Codice di verifica inviato! Controlla la tua email (anche spam).",
        })
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reimposta Password</CardTitle>
          <CardDescription className="text-center">
            {tokenVerified 
              ? "Inserisci la tua nuova password"
              : "Inserisci il codice a 6 cifre e la tua nuova password"}
          </CardDescription>
          {email && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                📧 <strong>Email:</strong> {email}<br />
                💡 <strong>Non vedi l'email?</strong> Controlla la cartella <strong>spam</strong> o usa il pulsante "Rinvia il codice" qui sotto.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {tokenVerified && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 text-center">
                ✓ Verifica completata! Puoi ora inserire la tua nuova password.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenVerified && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nuova Password</Label>
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
              <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                loading || 
                (!tokenVerified && code.length !== 6) || 
                password.length < 6 || 
                confirmPassword.length < 6
              }
            >
              {loading ? "Aggiornamento in corso..." : "Reimposta Password"}
            </Button>
          </form>

          {email && (
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
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

export default function ResetPasswordVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Reimposta Password</CardTitle>
            <CardDescription className="text-center">
              Caricamento...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordVerifyContent />
    </Suspense>
  )
}

