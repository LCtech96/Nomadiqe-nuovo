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
    // Recupera i dati dalla waitlist se disponibili
    const normalizedEmail = userEmail.toLowerCase().trim()
    console.log("Looking for waitlist data for email:", normalizedEmail)
    
    // Prima cerca waitlist approvata
    const { data: waitlistData, error: waitlistError } = await supabase
      .from("waitlist_requests")
      .select("full_name, role, phone_number, status")
      .eq("email", normalizedEmail)
      .eq("status", "approved")
      .maybeSingle()
    
    if (waitlistError) {
      console.error("Error fetching approved waitlist data:", waitlistError)
    } else {
      console.log("Approved waitlist data found:", waitlistData)
    }
    
    // Se non c'è waitlist approvata, verifica se esiste una waitlist in attesa
    if (!waitlistData) {
      const { data: pendingWaitlist, error: pendingError } = await supabase
        .from("waitlist_requests")
        .select("full_name, role, phone_number, status")
        .eq("email", normalizedEmail)
        .maybeSingle()
      
      if (pendingError) {
        console.error("Error fetching pending waitlist data:", pendingError)
      } else if (pendingWaitlist) {
        console.log("Pending waitlist found (not approved yet):", pendingWaitlist)
        console.warn("User has waitlist request but it's not approved. Role will not be assigned automatically.")
      } else {
        console.log("No waitlist found for this email. User will need to select role manually.")
      }
    }

    // Crea o aggiorna il profilo base
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (!existingProfile) {
      const emailParts = userEmail.split("@")
      const profileData: any = {
        id: userId,
        email: userEmail,
        full_name: waitlistData?.full_name || emailParts[0],
        username: emailParts[0],
        onboarding_completed: false, // IMPORTANTE: Imposta esplicitamente a false
      }

      // Se abbiamo dati dalla waitlist, includiamo anche il ruolo
      if (waitlistData?.role) {
        profileData.role = waitlistData.role
        console.log("Role from waitlist:", waitlistData.role)
      }

      const { error: profileError, data: insertedProfile } = await supabase
        .from("profiles")
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Se c'è un errore ma il profilo potrebbe essere stato creato, prova a recuperarlo
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, role, onboarding_completed")
          .eq("id", userId)
          .maybeSingle()
        
        if (existingProfile && !existingProfile.role && waitlistData?.role) {
          // Prova ad aggiornare il ruolo se non è stato assegnato
          console.log("Attempting to update role after profile creation error")
          await supabase
            .from("profiles")
            .update({ role: waitlistData.role, onboarding_completed: false })
            .eq("id", userId)
        }
      } else {
        console.log("Profile created with role:", profileData.role || "none")
        // Verifica che il ruolo sia stato salvato correttamente
        if (insertedProfile && !insertedProfile.role && waitlistData?.role) {
          console.log("Role not saved, attempting to update...")
          await supabase
            .from("profiles")
            .update({ role: waitlistData.role, onboarding_completed: false })
            .eq("id", userId)
        }
      }
    } else if (waitlistData) {
      // Se il profilo esiste già ma abbiamo dati dalla waitlist, aggiorniamolo
      const updateData: any = {}
      
      if (waitlistData.full_name) {
        updateData.full_name = waitlistData.full_name
      }
      
      if (waitlistData.role) {
        updateData.role = waitlistData.role
        console.log("Updating profile with role from waitlist:", waitlistData.role)
        // Se viene assegnato un ruolo, assicurati che onboarding_completed sia false
        updateData.onboarding_completed = false
      } else {
        // Se non c'è ruolo nella waitlist ma il profilo esiste, verifica se ha un ruolo
        // Se non ha ruolo, potrebbe essere un problema - logga per debug
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle()
        
        if (currentProfile && !currentProfile.role) {
          console.warn("Profile exists but has no role and no waitlist data found")
        }
      }

      if (Object.keys(updateData).length > 0) {
        console.log("Updating profile with data:", updateData)
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId)

        if (updateError) {
          console.error("Error updating profile with waitlist data:", updateError)
        } else {
          console.log("Profile updated with role:", updateData.role)
        }
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

    // Aspetta un momento per assicurarsi che il profilo sia stato salvato nel database
    await new Promise(resolve => setTimeout(resolve, 800))

    // Ricontrolla il profilo per assicurarsi che il ruolo sia stato salvato
    let retries = 0
    let userProfile = null
    while (retries < 5) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", userId)
        .maybeSingle()
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error)
        break
      }
      
      userProfile = data
      if (userProfile && userProfile.role) {
        console.log("Profile found with role:", { role: userProfile.role, onboarding_completed: userProfile.onboarding_completed })
        break
      }
      
      retries++
      if (retries < 5) {
        console.log(`Retry ${retries}/5: Waiting for profile to be saved...`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Se dopo tutti i tentativi non abbiamo trovato il ruolo, logga un warning
    if (!userProfile || !userProfile.role) {
      console.warn("Profile role not found after verification. User will need to select role manually.")
    }

    toast({
      title: "Successo",
      description: "Email verificata con successo!",
    })

    // Reindirizza all'onboarding per completare il profilo
    // Se l'utente ha già un ruolo dalla waitlist, andrà direttamente all'onboarding specifico
    router.push("/onboarding")
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

