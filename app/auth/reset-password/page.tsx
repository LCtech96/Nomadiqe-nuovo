"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const normalizedEmail = email.toLowerCase().trim()
      let emailSent = false
      let lastError: any = null

      // Strategia 1: Prova con signInWithOtp (metodo più affidabile per OTP)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false, // Non creare un nuovo utente
          emailRedirectTo: `${window.location.origin}/auth/reset-password-verify?email=${encodeURIComponent(normalizedEmail)}`,
        },
      })

      if (!otpError) {
        emailSent = true
      } else {
        console.error("signInWithOtp error:", otpError)
        lastError = otpError

        // Strategia 2: Fallback con resetPasswordForEmail (metodo alternativo)
        // Questo potrebbe funzionare anche se signInWithOtp fallisce
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password-verify?email=${encodeURIComponent(normalizedEmail)}`,
        })

        if (!resetError) {
          emailSent = true
        } else {
          console.error("resetPasswordForEmail error:", resetError)
          lastError = resetError
        }
      }

      if (!emailSent) {
        // Messaggi di errore più specifici
        let errorMessage = "Errore durante l'invio dell'email di recupero."
        let helpMessage = ""

        if (lastError?.message?.includes("email rate limit") || lastError?.message?.includes("rate_limit")) {
          errorMessage = "Troppi tentativi. Aspetta qualche minuto prima di riprovare."
        } else if (lastError?.message?.includes("SMTP") || lastError?.message?.includes("email")) {
          errorMessage = "Errore di configurazione email."
          helpMessage = "Contatta il supporto se il problema persiste."
        } else if (lastError?.message?.includes("not found") || lastError?.message?.includes("does not exist") || lastError?.message?.includes("User not found")) {
          errorMessage = "Nessun account trovato con questa email nel sistema di autenticazione."
          helpMessage = "Il tuo account potrebbe esistere nel database ma non essere ancora configurato per l'autenticazione. Contatta il supporto per risolvere il problema."
        } else if (lastError?.message) {
          errorMessage = lastError.message
        } else {
          helpMessage = "L'account potrebbe non esistere. Se non hai un account, clicca su 'Registrati' per crearne uno nuovo."
        }

        toast({
          title: "Errore",
          description: errorMessage + (helpMessage ? `\n\n${helpMessage}` : ""),
          variant: "destructive",
          duration: 8000,
        })
        setLoading(false)
        return
      }

      toast({
        title: "Email inviata!",
        description: "Controlla la tua email (anche spam) per il codice di verifica a 6 cifre per reimpostare la password.",
      })

      // Reindirizza alla pagina di verifica con l'email normalizzata
      router.push(`/auth/reset-password-verify?email=${encodeURIComponent(email.toLowerCase().trim())}`)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email",
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
          <CardTitle className="text-2xl font-bold text-center">Recupera Password</CardTitle>
          <CardDescription className="text-center">
            Inserisci la tua email per ricevere il codice di verifica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
              📧 <strong>Importante:</strong> Controlla anche la cartella <strong>spam</strong> per il codice di verifica.
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Invio in corso..." : "Invia codice di verifica"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Ricordi la password?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
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
            <CardTitle className="text-2xl font-bold text-center">Recupera Password</CardTitle>
            <CardDescription className="text-center">
              Caricamento...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

