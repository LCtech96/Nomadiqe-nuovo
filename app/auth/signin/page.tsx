"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"

const getDashboardUrl = (role: string | null): string => {
  switch (role) {
    case "host":
      return "/dashboard/host"
    case "creator":
      return "/dashboard/creator"
    case "manager":
      return "/dashboard/manager"
    case "traveler":
    default:
      return "/dashboard/traveler"
  }
}

export default function SignInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, onboarding_completed, full_name, username, avatar_url")
            .eq("id", session.user.id)
            .single()

          if (profile) {
            if (profile.onboarding_completed && profile.role) {
              // Redirect to home page (feed) as requested
              router.push("/home")
            } else if (profile.role && profile.full_name && profile.username) {
              // User has role and profile data, skip to home
              router.push("/home")
            } else if (profile.role) {
              router.push("/onboarding")
            } else {
              router.push("/onboarding")
            }
          }
        } catch (error) {
          console.error("Error checking profile:", error)
        }
      }
    }

    checkAuthAndRedirect()
  }, [status, session, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Parse error message
        let errorMessage = "Credenziali non valide"
        let helpMessage = ""
        
        if (result.error === "CredentialsSignin") {
          errorMessage = "Email o password non corretti"
          helpMessage = "Verifica di aver inserito le credenziali corrette. Se non hai un account, registrati."
        } else if (result.error.includes("Invalid login credentials")) {
          errorMessage = "Email o password non corretti"
          helpMessage = "Possibili cause:\n1. L'utente non esiste\n2. La password è errata\n3. L'email non è stata verificata"
        } else {
          errorMessage = result.error
        }

        toast({
          title: "Errore di accesso",
          description: errorMessage + (helpMessage ? `\n\n${helpMessage}` : ""),
          variant: "destructive",
        })
      } else if (result?.ok) {
        toast({
          title: "Accesso riuscito",
          description: "Benvenuto su Nomadiqe!",
        })
        
        // Force session refresh and redirect to home
        // The home page will handle redirecting to onboarding if needed
        window.location.href = "/home"
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore durante l'accesso",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/home" })
  }

  // Show loading only while session is being checked initially
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Accedi a Nomadiqe</CardTitle>
          <CardDescription className="text-center">
            Soggiorni Più Equi, Connessioni Più Profonde
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Oppure</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continua con Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Registrati
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

