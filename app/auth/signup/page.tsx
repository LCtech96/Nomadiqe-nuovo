"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Eye, EyeOff } from "lucide-react"

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [approvalChecked, setApprovalChecked] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Precompila il referral code se presente nell'URL
  useEffect(() => {
    const refParam = searchParams.get("ref")
    if (refParam) {
      setReferralCode(refParam.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    }
  }, [searchParams])

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (!emailParam) {
      router.replace("/")
      return
    }

    setEmail(emailParam)

    const verifyApproval = async () => {
      try {
        const response = await fetch(`/api/waitlist/verify?email=${encodeURIComponent(emailParam)}`)
        if (!response.ok) {
          router.replace("/")
          return
        }
        const data = await response.json()
        if (!data?.approved) {
          router.replace("/")
          return
        }
        setIsApproved(true)
      } catch {
        router.replace("/")
      } finally {
        setApprovalChecked(true)
      }
    }

    verifyApproval()
  }, [searchParams, router])

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
      // Questo dovrebbe inviare automaticamente un'email con il codice OTP
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      })

      if (signUpError) {
        console.error("SignUp error:", signUpError)
        toast({
          title: "Errore",
          description: signUpError.message || "Errore durante la registrazione. Riprova.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Verifica se l'utente è stato creato
      if (!signUpData?.user) {
        toast({
          title: "Errore",
          description: "Impossibile creare l'account. Riprova.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Assicurati che l'email di verifica venga inviata immediatamente
      // Usiamo signInWithOtp come metodo principale perché è più affidabile
      let emailSent = false
      if (!signUpData.session) {
        // L'utente non è ancora verificato, invia l'email di verifica immediatamente
        // Aspetta un breve momento per assicurarsi che l'utente sia stato creato nel database
        await new Promise(resolve => setTimeout(resolve, 300))
        
        try {
          // Metodo principale: usa signInWithOtp (più affidabile)
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false, // L'utente esiste già dalla registrazione
              emailRedirectTo: `${window.location.origin}/auth/verify-email`,
            },
          })

          if (!otpError) {
            emailSent = true
            console.log("Email di verifica inviata con signInWithOtp")
          } else {
            console.error("signInWithOtp error:", otpError)
            
            // Fallback: prova con resend
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: email,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/verify-email`,
              },
            })

            if (!resendError) {
              emailSent = true
              console.log("Email di verifica inviata con resend")
            } else {
              console.error("Resend error:", resendError)
            }
          }
        } catch (emailError) {
          console.error("Error sending verification email:", emailError)
        }
      } else {
        // Se c'è già una sessione, l'email è stata inviata
        emailSent = true
      }

      toast({
        title: "Account creato!",
        description: emailSent 
          ? "Email di verifica inviata! Controlla la tua casella di posta (anche spam) per il codice a 6 cifre."
          : "Account creato! Vai alla pagina di verifica e usa il pulsante 'Rinvia il codice' se non ricevi l'email.",
      })

      // Salva il referral code se fornito (lo useremo dopo la verifica email)
      if (referralCode && referralCode.trim()) {
        try {
          // Salva in localStorage per usarlo dopo la verifica
          localStorage.setItem('pending_referral_code', referralCode.trim().toUpperCase())
        } catch (e) {
          console.error("Error saving referral code:", e)
        }
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

  if (!approvalChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Caricamento...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isApproved) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <div className="relative w-full h-24 md:h-32 rounded-t-lg overflow-visible bg-transparent flex items-center justify-center p-6">
          <div className="relative w-full h-full max-w-[200px] max-h-[200px] mx-auto">
            <Image
              src="/onboarding.png"
              alt="Nomadiqe"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registrati su Nomadiqe</CardTitle>
          <CardDescription className="text-center">
            Crea il tuo account per iniziare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
              📧 <strong>Importante:</strong> Dopo la registrazione, controlla anche la cartella <strong>spam</strong> per il codice di verifica email.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Codice Referral (opzionale)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="CODICE123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Hai un codice referral? Inseriscilo qui per guadagnare bonus!
              </p>
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

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <div className="relative w-full h-24 md:h-32 rounded-t-lg overflow-visible bg-transparent flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-[200px] max-h-[200px] mx-auto">
              <Image
                src="/onboarding.png"
                alt="Nomadiqe"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Registrati su Nomadiqe</CardTitle>
            <CardDescription className="text-center">
              Caricamento...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}

