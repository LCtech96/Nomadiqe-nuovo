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
import { UserRole, Profile } from "@/types/user"
import HostOnboarding from "@/components/onboarding/host-onboarding"

type OnboardingStep = "profile" | "role" | "role-specific"

const getDashboardUrl = (role: UserRole | null): string => {
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

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<OnboardingStep>("profile")
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  
  // Profile data
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  
  // Role selection
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (status === "unauthenticated") {
        router.push("/auth/signin")
        return
      }

      if (status !== "authenticated" || !session?.user?.id) {
        return
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile(data)
          
          // If onboarding is completed, redirect to role-specific dashboard
          if (data.onboarding_completed && data.role) {
            router.push(getDashboardUrl(data.role))
            return
          }

          // If user already has a role selected, load their data
          if (data.role) {
            setSelectedRole(data.role)
          }

          // Set initial step based on onboarding progress
          if (data.onboarding_step === 0) {
            setStep("profile")
          } else if (data.onboarding_step === 1) {
            setStep("role")
            setFullName(data.full_name || "")
            setUsername(data.username || "")
            setAvatarUrl(data.avatar_url || "")
          } else if (data.onboarding_step >= 2) {
            setStep("role-specific")
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      } finally {
        setCheckingOnboarding(false)
      }
    }

    checkOnboardingStatus()
  }, [status, session, router, supabase])

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

      // If role is host, go to host-specific onboarding
      if (selectedRole === "host") {
        setStep("role-specific")
      } else {
        // For other roles, complete onboarding immediately and redirect
        const { error: completeError } = await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            onboarding_step: 3,
          })
          .eq("id", session.user.id)

        if (completeError) throw completeError

        router.push(getDashboardUrl(selectedRole))
      }
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

  if (!session) {
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

  if (checkingOnboarding || !session) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  // Role-specific onboarding
  if (step === "role-specific" && selectedRole === "host") {
    return (
      <HostOnboarding
        onComplete={() => {
          router.push("/dashboard/host")
        }}
      />
    )
  }

  // Default fallback (should not reach here in normal flow)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Caricamento...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Stiamo preparando la tua dashboard...</p>
        </CardContent>
      </Card>
    </div>
  )
}

