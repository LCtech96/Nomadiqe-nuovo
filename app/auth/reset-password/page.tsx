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
      // Verifica prima se l'utente esiste
      const { data: userCheck } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle()

      if (!userCheck) {
        toast({
          title: "Email non trovata",
          description: "Non esiste un account con questa email. Verifica l'indirizzo e riprova.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Usa signInWithOtp per inviare un codice OTP via email
      // Questo metodo funziona meglio di resetPasswordForEmail per inviare codici OTP
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Non creare un nuovo utente
          emailRedirectTo: `${window.location.origin}/auth/reset-password-verify?email=${encodeURIComponent(email)}`,
        },
      })

      if (error) {
        console.error("Reset password error:", error)
        
        // Messaggi di errore più specifici
        let errorMessage = "Errore durante l'invio dell'email di recupero. Riprova."
        if (error.message?.includes("email rate limit")) {
          errorMessage = "Troppi tentativi. Aspetta qualche minuto prima di riprovare."
        } else if (error.message?.includes("SMTP") || error.message?.includes("email")) {
          errorMessage = "Errore di configurazione email. Contatta il supporto se il problema persiste."
        }
        
        toast({
          title: "Errore",
          description: errorMessage,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      toast({
        title: "Email inviata!",
        description: "Controlla la tua email (anche spam) per il codice di verifica a 6 cifre per reimpostare la password.",
      })

      // Reindirizza alla pagina di verifica con l'email
      router.push(`/auth/reset-password-verify?email=${encodeURIComponent(email)}`)
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

