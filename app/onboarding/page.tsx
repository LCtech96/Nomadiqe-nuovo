"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"
import { UserRole } from "@/types/user"

type OnboardingStep = "profile" | "role" | "role-specific"

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<OnboardingStep>("profile")
  const [loading, setLoading] = useState(false)
  
  // Profile data
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  
  // Role selection
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
          avatar_url: avatarUrl,
          onboarding_step: 1,
        })
        .eq("id", session.user.id)

      if (error) throw error

      setStep("role")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleRoleSubmit = async () => {
    if (!session?.user?.id || !selectedRole) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: selectedRole,
          onboarding_step: 2,
        })
        .eq("id", session.user.id)

      if (error) throw error

      // Award onboarding points
      await supabase.from("points_history").insert({
        user_id: session.user.id,
        points: 75,
        action_type: "onboarding",
        description: "Onboarding completato",
      })

      await supabase
        .from("profiles")
        .update({ points: 175 }) // 100 sign up + 75 onboarding
        .eq("id", session.user.id)

      setStep("role-specific")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Completa il tuo profilo</CardTitle>
            <CardDescription>Passo 1 di 3</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvataggio..." : "Continua"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Scegli il tuo ruolo</CardTitle>
            <CardDescription>Passo 2 di 3 - Seleziona come vuoi utilizzare Nomadiqe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "traveler" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleRoleSelect("traveler")}
              >
                <CardHeader>
                  <CardTitle>Traveler</CardTitle>
                  <CardDescription>Viaggia e scopri</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Cerca e prenota alloggi, connettiti con altri viaggiatori
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "host" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleRoleSelect("host")}
              >
                <CardHeader>
                  <CardTitle>Host</CardTitle>
                  <CardDescription>Pubblica la tua struttura</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Pubblica proprietà e collabora con creator
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "creator" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleRoleSelect("creator")}
              >
                <CardHeader>
                  <CardTitle>Creator</CardTitle>
                  <CardDescription>Crea e collabora</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Collabora con host per creare contenuti
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "manager" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleRoleSelect("manager")}
              >
                <CardHeader>
                  <CardTitle>Manager</CardTitle>
                  <CardDescription>Offri servizi</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Offri servizi di gestione, pulizie e altro
                  </p>
                </CardContent>
              </Card>
            </div>
            <Button
              onClick={handleRoleSubmit}
              className="w-full"
              disabled={!selectedRole || loading}
            >
              {loading ? "Salvataggio..." : "Continua"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Role-specific onboarding will be handled in separate components
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Onboarding completato!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Ora puoi iniziare a utilizzare Nomadiqe.</p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Vai alla Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

