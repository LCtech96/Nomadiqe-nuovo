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
          .maybeSingle()

        // Handle profile not found - this is OK, we'll create it during onboarding
        if (error && error.code !== "PGRST116" && error.code !== "PGRST301") {
          console.error("Error checking profile:", error)
        }

        if (data) {
          setProfile(data)
          
          // If user is already registered and has completed onboarding - redirect to home
          if (data.role && data.full_name && data.username && data.onboarding_completed) {
            router.push("/home")
            return
          }
          
          // If user has a role selected, restore it and show appropriate onboarding
          if (data.role) {
            setSelectedRole(data.role)
            
            // If role is host, always go to host-specific onboarding (even if not completed)
            if (data.role === "host") {
              setStep("role-specific")
              setCheckingOnboarding(false)
              return
            }
            
            // For other roles, if they have basic info, redirect to home
            if (data.full_name && data.username) {
              router.push("/home")
              return
            }
            
            // For other roles without basic info, they should complete onboarding
            // But since they're not host, they should have completed it already
            // So redirect to home anyway
            router.push("/home")
            return
          }

          // If no role selected, start with role selection
          setStep("role")
        } else {
          // Profile doesn't exist - start with role selection
          setStep("role")
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
        // If profile doesn't exist, just start with role selection
        setStep("role")
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
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()

      // Prepare profile data for UPSERT
      const profileData: any = {
        id: session.user.id,
        role: selectedRole,
        email: session.user.email || "", // Add email to satisfy NOT NULL constraint
      }

      // If profile doesn't exist, add initial values
      if (!existingProfile) {
        profileData.full_name = session.user.name || session.user.email?.split("@")[0] || ""
        profileData.username = session.user.email?.split("@")[0] || ""
      }

      // UPSERT: creates if doesn't exist, updates if exists
      // First try without onboarding_status (in case PostgREST cache hasn't updated)
      let { error: upsertError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })

      // If error is about onboarding_status column not found, try again without it
      if (upsertError && upsertError.code === 'PGRST204' && upsertError.message?.includes('onboarding_status')) {
        console.warn("onboarding_status column not in cache yet, saving without it for now")
        // Remove onboarding_status and try again
        const profileDataWithoutStatus = { ...profileData }
        delete profileDataWithoutStatus.onboarding_status
        const { error: retryError } = await supabase
          .from("profiles")
          .upsert(profileDataWithoutStatus, { onConflict: "id" })
        
        if (retryError) {
          console.error("Upsert error (retry):", retryError)
          throw retryError
        }
      } else if (upsertError) {
        console.error("Upsert error:", upsertError)
        throw upsertError
      }
      // onboarding_status temporarily disabled due to PostgREST cache issue

      // If role is host, go to host-specific onboarding
      if (selectedRole === "host") {
        setStep("role-specific")
      } else {
        // For other roles, mark onboarding as completed and redirect to home
        try {
          await supabase
            .from("profiles")
            .update({
              onboarding_completed: true,
            })
            .eq("id", session.user.id)
        } catch (err) {
          console.warn("Could not update onboarding_completed:", err)
        }
        
        router.push("/home")
      }
    } catch (error: any) {
      console.error("Error in handleRoleSubmit:", error)
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio. Riprova.",
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
      <div className="min-h-screen">
        {profile?.role === "host" && (
          <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Sei già registrato come <strong>Host</strong>. Completa l'onboarding per pubblicare la tua prima struttura.
              </p>
            </div>
          </div>
        )}
        <HostOnboarding
          onComplete={() => {
            router.push("/home")
          }}
        />
      </div>
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

