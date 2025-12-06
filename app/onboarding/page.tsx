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

type OnboardingStep = "role" | "role-specific"

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
  const [step, setStep] = useState<OnboardingStep>("role")
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  
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
          
          // If onboarding is completed, redirect to home
          if (data.onboarding_completed && data.role) {
            router.push("/home")
            return
          }

          // If user has role AND profile data (name, username, avatar), skip onboarding completely
          if (data.role && data.full_name && data.username) {
            router.push("/home")
            return
          }

          // If user already has a role selected
          if (data.role) {
            setSelectedRole(data.role)
            // If role is host and onboarding not completed, go to host onboarding
            if (data.role === "host" && !data.onboarding_completed) {
              setStep("role-specific")
              setCheckingOnboarding(false)
              return
            }
            // If profile data exists and onboarding completed, redirect to home
            if (data.full_name && data.username && data.onboarding_completed) {
              router.push("/home")
              return
            }
          }

          // If no role selected, start with role selection
          if (!data.role) {
            setStep("role")
          } else if (data.role === "host") {
            // Go directly to host onboarding if role is host
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

      // If role is host, go to host-specific onboarding (which includes profile setup)
      if (selectedRole === "host") {
        setStep("role-specific")
      } else {
        // For other roles, they still need basic profile info, but we'll handle it in their specific onboarding
        // For now, redirect to dashboard (they can complete profile later)
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


  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Scegli il tuo ruolo</CardTitle>
            <CardDescription>Passo 1 - Seleziona come vuoi utilizzare Nomadiqe</CardDescription>
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
          router.push("/home")
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

