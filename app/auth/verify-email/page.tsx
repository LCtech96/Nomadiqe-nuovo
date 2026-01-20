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

  const registerReferralIfExists = async () => {
    try {
      const pendingCode = localStorage.getItem('pending_referral_code')
      if (!pendingCode) return

      // Ottieni l'utente corrente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      // Chiama la funzione SQL per registrare il referral
      const { data, error } = await supabase.rpc('register_referral', {
        referred_user_id: user.id,
        code_used: pendingCode.trim().toUpperCase()
      })

      if (error) {
        console.error("Error registering referral:", error)
        // Non mostrare errore all'utente, il codice potrebbe essere invalido
      } else if (data) {
        // Rimuovi il codice da localStorage
        localStorage.removeItem('pending_referral_code')
        toast({
          title: "Bonus referral!",
          description: "Hai utilizzato un codice referral. Il referrer riceverà i punti bonus!",
        })
      }
    } catch (error) {
      console.error("Error in registerReferralIfExists:", error)
    }
  }

  // Funzione per creare profilo base dopo verifica email
  const handleFirstVerificationComplete = async (userEmail: string, userId: string) => {
    // Crea o aggiorna il profilo base
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (!existingProfile) {
      const emailParts = userEmail.split("@")
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: userEmail,
          full_name: emailParts[0],
          username: emailParts[0],
        })

      if (profileError) {
        console.error("Error creating profile:", profileError)
      }
    }

    // Crea o aggiorna record in email_verifications
    const { data: emailVerification } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!emailVerification) {
      // Crea nuovo record - NO seconda verifica richiesta
      const { error: insertError } = await supabase
        .from("email_verifications")
        .insert({
          user_id: userId,
          email: userEmail,
          first_verification_completed: true,
          first_verification_completed_at: new Date().toISOString(),
          second_verification_required: false, // Non richiediamo più seconda verifica
          second_verification_completed: true, // Consideriamo completata
        })

      if (insertError) {
        console.error("Error creating email verification record:", insertError)
      }
    } else {
      // Aggiorna record esistente - marca come completato
      const { error: updateError } = await supabase
        .from("email_verifications")
        .update({
          first_verification_completed: true,
          first_verification_completed_at: new Date().toISOString(),
          second_verification_required: false, // Non richiediamo più seconda verifica
          second_verification_completed: true, // Consideriamo completata
        })
        .eq("user_id", userId)

      if (updateError) {
        console.error("Error updating email verification:", updateError)
      }
    }

    // Registra referral se presente
    await registerReferralIfExists()

    // Controlla se l'utente ha già completato l'onboarding (ha un ruolo)
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()

    toast({
      title: "Successo",
      description: "Email verificata con successo!",
    })

    // Sempre reindirizza alla home dopo la registrazione
    // L'utente vedrà la selezione dei ruoli sulla home se non ne ha ancora uno
    router.push("/home")
  }

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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email && user?.id) {
          await handleFirstVerificationComplete(user.email, user.id)
        } else {
          toast({
            title: "Errore",
            description: "Impossibile recuperare i dati utente",
            variant: "destructive",
          })
        }
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

  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      // Auto-verify if token is present
      handleVerifyToken(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email && user?.id) {
          await handleFirstVerificationComplete(user.email, user.id)
        } else {
          toast({
            title: "Errore",
            description: "Impossibile recuperare i dati utente",
            variant: "destructive",
          })
        }
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
          {email && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                📧 <strong>Email inviata a:</strong> {email}<br />
                💡 <strong>Non vedi l'email?</strong> Controlla la cartella <strong>spam</strong> o usa il pulsante "Rinvia il codice" qui sotto.
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
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setResending(true)
                  try {
                    let emailSent = false
                    let lastError: any = null

                    // Strategia 1: Prova con signInWithOtp (metodo più affidabile)
                    // Questo funziona sia per utenti esistenti che nuovi
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                      email,
                      options: {
                        shouldCreateUser: false, // L'utente esiste già dalla registrazione
                        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
                      },
                    })

                    if (!otpError) {
                      emailSent = true
                    } else {
                      lastError = otpError
                      console.error("signInWithOtp error:", otpError)
                      
                      // Strategia 2: Fallback con resend (solo se signInWithOtp fallisce)
                      const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                        options: {
                          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
                        },
                      })

                      if (!resendError) {
                        emailSent = true
                      } else {
                        console.error("Resend error:", resendError)
                        lastError = resendError
                      }
                    }

                    if (emailSent) {
                      toast({
                        title: "Successo",
                        description: "Codice di verifica inviato! Controlla la tua email (anche spam).",
                      })
                    } else {
                      // Mostra un messaggio più dettagliato con l'errore
                      const errorMessage = lastError?.message || "Errore sconosciuto"
                      console.error("Failed to send email:", lastError)
                      toast({
                        title: "Errore",
                        description: `Impossibile inviare il codice: ${errorMessage}. Verifica la configurazione SMTP su Supabase.`,
                        variant: "destructive",
                      })
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

