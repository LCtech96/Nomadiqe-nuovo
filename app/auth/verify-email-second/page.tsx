"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

function VerifyEmailSecondContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [resendCountdown, setResendCountdown] = useState<number | null>(null)
  const email = searchParams.get("email") || ""

  // Funzione helper per verificare se un dominio richiede seconda verifica
  const requiresSecondVerification = (emailDomain: string): boolean => {
    const trustedDomains = ['gmail.com', 'outlook.it', 'libero.it', 'hotmail.com']
    return !trustedDomains.includes(emailDomain.toLowerCase())
  }

  // Controlla lo stato del rinvio
  useEffect(() => {
    const checkResendStatus = async () => {
      if (!email) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      const { data: emailVerification } = await supabase
        .from("email_verifications")
        .select("resend_attempts, next_resend_allowed_at")
        .eq("user_id", user.id)
        .single()

      if (emailVerification) {
        const now = new Date()
        const nextAllowed = emailVerification.next_resend_allowed_at 
          ? new Date(emailVerification.next_resend_allowed_at)
          : null

        if (nextAllowed && nextAllowed > now) {
          const diff = Math.floor((nextAllowed.getTime() - now.getTime()) / 1000)
          if (diff > 0) {
            setResendCountdown(diff)
            setCanResend(false)
          } else {
            setCanResend(true)
            setResendCountdown(null)
          }
        } else {
          setCanResend(true)
          setResendCountdown(null)
        }
      } else {
        setCanResend(true)
        setResendCountdown(null)
      }
    }

    checkResendStatus()
    const interval = setInterval(checkResendStatus, 1000)
    return () => clearInterval(interval)
  }, [email, supabase])

  // Aggiorna countdown
  useEffect(() => {
    if (resendCountdown !== null && resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (resendCountdown === 0) {
      setCanResend(true)
      setResendCountdown(null)
    }
  }, [resendCountdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        toast({
          title: "Errore",
          description: "Sessione non valida. Per favore accedi di nuovo.",
          variant: "destructive",
        })
        router.push("/auth/signin")
        return
      }

      // Verifica il codice dalla tabella email_verifications
      const { data: emailVerification, error: fetchError } = await supabase
        .from("email_verifications")
        .select("second_verification_code, second_verification_code_expires_at")
        .eq("user_id", user.id)
        .single()

      if (fetchError || !emailVerification) {
        toast({
          title: "Errore",
          description: "Codice di verifica non trovato. Richiedi un nuovo codice.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Verifica se il codice è scaduto
      const now = new Date()
      const expiresAt = emailVerification.second_verification_code_expires_at
        ? new Date(emailVerification.second_verification_code_expires_at)
        : null

      if (expiresAt && expiresAt < now) {
        toast({
          title: "Codice scaduto",
          description: "Il codice di verifica è scaduto. Richiedi un nuovo codice.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Verifica il codice
      if (emailVerification.second_verification_code !== code) {
        toast({
          title: "Codice errato",
          description: "Il codice inserito non è corretto. Riprova.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Codice corretto! Aggiorna lo stato
      const { error: updateError } = await supabase
        .from("email_verifications")
        .update({
          second_verification_completed: true,
          second_verification_completed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (updateError) {
        console.error("Error updating verification:", updateError)
        toast({
          title: "Errore",
          description: "Errore durante l'aggiornamento. Riprova.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      toast({
        title: "Successo",
        description: "Seconda verifica email completata con successo!",
      })

      // Controlla se l'utente ha già un ruolo
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      // Sempre reindirizza alla home dopo la verifica
      // L'utente vedrà la selezione dei ruoli sulla home se non ne ha ancora uno
      const returnTo = searchParams.get("returnTo") || "/home"
      router.push(returnTo)
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

  const handleResend = async () => {
    if (!canResend) return

    setResending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        toast({
          title: "Errore",
          description: "Sessione non valida.",
          variant: "destructive",
        })
        setResending(false)
        return
      }

      // Recupera lo stato attuale
      const { data: emailVerification } = await supabase
        .from("email_verifications")
        .select("resend_attempts, last_resend_at, next_resend_allowed_at")
        .eq("user_id", user.id)
        .single()

      if (!emailVerification) {
        toast({
          title: "Errore",
          description: "Record di verifica non trovato.",
          variant: "destructive",
        })
        setResending(false)
        return
      }

      const attempts = emailVerification.resend_attempts || 0
      const now = new Date()
      
      // Verifica se c'è un prossimo rinvio permesso nel database
      const nextAllowedAt = emailVerification.next_resend_allowed_at
        ? new Date(emailVerification.next_resend_allowed_at)
        : null

      // Se c'è un prossimo rinvio permesso e non è ancora passato, blocca
      if (nextAllowedAt && now < nextAllowedAt) {
        const waitTime = Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 1000)
        const minutes = Math.floor(waitTime / 60)
        const hours = Math.floor(minutes / 60)
        const displayTime = hours > 0 
          ? `${hours} ${hours === 1 ? 'ora' : 'ore'}`
          : `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'}`
        
        toast({
          title: "Attendi",
          description: `Puoi richiedere un nuovo codice tra ${displayTime}.`,
          variant: "destructive",
        })
        setResending(false)
        return
      }

      // Calcola il prossimo rinvio permesso basandosi sul numero di tentativi
      let newNextAllowedAt: Date
      if (attempts === 0) {
        // Primo rinvio: permesso subito, prossimo dopo 1 ora
        newNextAllowedAt = new Date(now.getTime() + 60 * 60 * 1000)
      } else if (attempts === 1) {
        // Secondo rinvio: dopo 1 ora, prossimo dopo 24 ore
        newNextAllowedAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      } else {
        // Terzo rinvio e successivi: dopo 24 ore
        newNextAllowedAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }

      // Genera nuovo codice a 6 cifre
      const newCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000) // 10 minuti

      // Aggiorna il record
      const { error: updateError } = await supabase
        .from("email_verifications")
        .update({
          second_verification_code: newCode,
          second_verification_code_expires_at: expiresAt.toISOString(),
          resend_attempts: attempts + 1,
          last_resend_at: now.toISOString(),
          next_resend_allowed_at: newNextAllowedAt.toISOString(),
        })
        .eq("user_id", user.id)

      if (updateError) {
        console.error("Error updating resend:", updateError)
        toast({
          title: "Errore",
          description: "Errore durante l'invio. Riprova più tardi.",
          variant: "destructive",
        })
        setResending(false)
        return
      }

      // Invia email con il codice
      try {
        const response = await fetch("/api/send-second-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: newCode }),
        })
        
        if (!response.ok) {
          console.error("Failed to send second verification email")
          toast({
            title: "Errore",
            description: "Errore durante l'invio dell'email. Riprova più tardi.",
            variant: "destructive",
          })
          setResending(false)
          return
        }
      } catch (error) {
        console.error("Error calling send-second-verification API:", error)
        toast({
          title: "Errore",
          description: "Errore durante l'invio dell'email. Riprova più tardi.",
          variant: "destructive",
        })
        setResending(false)
        return
      }
      
      toast({
        title: "Codice inviato",
        description: `Nuovo codice di verifica inviato a ${email}. Controlla la tua casella email.`,
      })

      // Imposta il countdown per il prossimo rinvio
      const countdownSeconds = Math.ceil((newNextAllowedAt.getTime() - now.getTime()) / 1000)
      if (countdownSeconds > 0) {
        setResendCountdown(countdownSeconds)
        setCanResend(false)
      } else {
        setCanResend(true)
        setResendCountdown(null)
      }
    } catch (error: any) {
      console.error("Unexpected error:", error)
      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  const formatCountdown = (seconds: number): string => {
    if (seconds < 60) return `${seconds} secondi`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minuti`
    return `${Math.floor(seconds / 3600)} ore`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Seconda Verifica Email</CardTitle>
          <CardDescription className="text-center">
            Inserisci il secondo codice di verifica a 6 cifre inviato alla tua email
          </CardDescription>
          {email && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                📧 <strong>Email:</strong> {email}<br />
                🔒 <strong>Verifica aggiuntiva richiesta</strong> per domini personalizzati
              </p>
            </div>
          )}
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
            <div className="mt-4 text-center space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending || !canResend}
                className="text-sm"
              >
                {resending 
                  ? "Invio in corso..." 
                  : resendCountdown !== null
                  ? `Rinvia il codice (tra ${formatCountdown(resendCountdown)})`
                  : "Rinvia il codice"
                }
              </Button>
              {resendCountdown !== null && resendCountdown > 0 && (
                <p className="text-xs text-muted-foreground">
                  Puoi richiedere un nuovo codice tra {formatCountdown(resendCountdown)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailSecondPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Seconda Verifica Email</CardTitle>
            <CardDescription className="text-center">
              Caricamento...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyEmailSecondContent />
    </Suspense>
  )
}

