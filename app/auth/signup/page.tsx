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

  // Precompila il referral code se presente nell'URL
  useEffect(() => {
    const refParam = searchParams.get("ref")
    if (refParam) {
      setReferralCode(refParam.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    }
  }, [searchParams])

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

      // signUp() dovrebbe aver già inviato automaticamente l'email con il codice OTP
      // Non chiamiamo resend() qui per evitare conflitti o doppi invii
      toast({
        title: "Account creato!",
        description: "Controlla la tua email (anche spam) per il codice di verifica a 6 cifre. Se non arriva entro qualche minuto, usa il pulsante 'Rinvia il codice' nella pagina successiva.",
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

