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
import { useI18n } from "@/lib/i18n/context"
import HostOnboarding from "@/components/onboarding/host-onboarding"
import JollyOnboarding from "@/components/onboarding/jolly-onboarding"
import CreatorOnboarding from "@/components/onboarding/creator-onboarding"

type OnboardingStep = "role" | "role-specific"

const getDashboardUrl = (role: UserRole | null): string => {
  switch (role) {
    case "host":
      return "/dashbord/host"
    case "creator":
      return "/dashboard/creator"
    case "jolly":
      return "/dashboard/jolly"
    case "traveler":
    default:
      return "/dashboard/traveler"
  }
}

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<OnboardingStep>("role")
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  
  // Role selection
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  
  // Verifica sessione all'avvio
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (session?.user?.id || supabaseUser?.id) {
        setHasSession(true)
      }
    }
    checkSession()
  }, [session, supabase])

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Prima verifica se c'è una sessione Supabase attiva (utile dopo verifica email)
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      
      // Se non c'è sessione Next-Auth ma c'è sessione Supabase, usa quella
      if (status === "unauthenticated" && !supabaseUser) {
        router.push("/auth/signin")
        return
      }

      // Usa l'ID utente da Supabase se Next-Auth non è disponibile
      const userId = session?.user?.id || supabaseUser?.id
      
      if (!userId) {
        // Se non c'è nessuna sessione, reindirizza al login
        if (status === "unauthenticated") {
          router.push("/auth/signin")
        }
        return
      }

      try {
        // Usa l'ID utente da Supabase se Next-Auth non è disponibile
        const userId = session?.user?.id || supabaseUser?.id
        if (!userId) return
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        // Handle profile not found - this is OK, we'll create it during onboarding
        if (error && error.code !== "PGRST116" && error.code !== "PGRST301") {
          console.error("Error checking profile:", error)
        }

        if (data) {
          setProfile(data)
          console.log("Profile data in onboarding:", { role: data.role, onboarding_completed: data.onboarding_completed })
          
          // Se l'utente ha già completato l'onboarding, reindirizza alla Home
          if (data.onboarding_completed) {
            router.push("/home")
            return
          }

          // Se l'utente ha un ruolo ma non ha completato l'onboarding, procedi con l'onboarding specifico
          // MA solo se ha già completato almeno il profilo base (ha full_name)
          // Altrimenti mostra la selezione del ruolo per permettere di cambiarlo se necessario
          if (data.role && data.full_name) {
            console.log("User has role:", data.role, "and profile - Starting role-specific onboarding")
            setSelectedRole(data.role)
            if (data.role === "host" || data.role === "jolly" || data.role === "creator") {
              setStep("role-specific")
            } else {
              router.push("/home")
            }
          } else if (data.role && !data.full_name) {
            console.log("User has role but no profile - showing role selection or proceeding")
            setSelectedRole(data.role)
            if (data.role === "host" || data.role === "jolly" || data.role === "creator") {
              setStep("role-specific")
            } else {
              setStep("role")
            }
          } else {
            // Se l'utente non ha un ruolo, mostra la selezione del ruolo
            // Non reindirizzare alla home, ma permettere la selezione qui
            console.log("User has no role - showing role selection")
            setStep("role")
          }
        } else {
          // Profile doesn't exist - show role selection here
          console.log("Profile doesn't exist - showing role selection")
          setStep("role")
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
        router.push("/home")
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
    // Ottieni l'ID utente da Supabase se Next-Auth non è disponibile
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = session?.user?.id || supabaseUser?.id
    
    if (!userId || !selectedRole) {
      toast({
        title: t("common.error"),
        description: t("onboarding.invalidSession"),
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    setLoading(true)
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .maybeSingle()

      // Prepare profile data
      const profileData: any = {
        role: selectedRole,
      }

      // Se il profilo non esiste, crealo con tutti i campi necessari
      if (!existingProfile) {
        const userEmail = session?.user?.email || supabaseUser?.email || ""
        const newProfileData: any = {
          id: userId,
          email: userEmail,
          role: selectedRole,
          full_name: session?.user?.name || supabaseUser?.user_metadata?.full_name || userEmail.split("@")[0] || "",
          username: userEmail.split("@")[0] || "",
        }
        
        // IMPORTANTE: Per host e jolly, onboarding_completed deve essere FALSE
        // Per gli altri ruoli, può essere TRUE (onboarding semplice)
        if (selectedRole === "host" || selectedRole === "jolly") {
          newProfileData.onboarding_completed = false
        } else {
          newProfileData.onboarding_completed = true
        }

        const { error: insertError } = await supabase
          .from("profiles")
          .insert(newProfileData)

        if (insertError) {
          console.error("Insert error:", insertError)
          throw insertError
        }
      } else {
        // Se il profilo esiste, aggiorna ruolo e onboarding_completed insieme
        const updateData: any = {
          role: selectedRole,
        }
        
        // IMPORTANTE: host, jolly e creator hanno onboarding multi-step -> FALSE
        if (selectedRole === "host" || selectedRole === "jolly" || selectedRole === "creator") {
          updateData.onboarding_completed = false
        } else {
          updateData.onboarding_completed = true
        }
        
        console.log("Updating existing profile:", updateData)
        const { data: updateResult, error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId)
          .select("role, onboarding_completed")

        if (updateError) {
          console.error("Update error:", updateError)
          throw updateError
        }
        
        console.log("Update successful:", updateResult)
      }
      
      // Non verifichiamo subito perché potrebbe essere un problema di cache del database
      // Se l'UPDATE non ha dato errori, assumiamo che sia andato a buon fine

      // Invia messaggio di benvenuto dall'assistente AI
      try {
        const userEmail = session?.user?.email || supabaseUser?.email || ""
        const response = await fetch("/api/ai-assistant/welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            role: selectedRole,
            username: userEmail.split("@")[0],
            fullName: session?.user?.name || supabaseUser?.user_metadata?.full_name,
          }),
        })
        if (!response.ok) {
          console.warn("Errore nell'invio del messaggio di benvenuto (non critico)")
        }
      } catch (error) {
        console.warn("Errore chiamata API welcome (non critico):", error)
      }

      // Mostra un messaggio di successo
      toast({
        title: "Successo",
        description: `Ruolo ${selectedRole} selezionato con successo!`,
      })

      if (selectedRole === "host" || selectedRole === "jolly" || selectedRole === "creator") {
        setStep("role-specific")
      } else {
        router.push("/home")
      }
    } catch (error: any) {
      console.error("Error in handleRoleSubmit:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("onboarding.saveError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center">{t("onboarding.loading")}</div>
  }

  if (!hasSession && status === "unauthenticated") {
    return <div className="min-h-screen flex items-center justify-center">{t("onboarding.loading")}</div>
  }

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t("onboarding.chooseRole")}</CardTitle>
            <CardDescription>{t("onboarding.step1Select")}</CardDescription>
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
                  <CardTitle>{t("role.traveler")}</CardTitle>
                  <CardDescription>{t("onboarding.travelerDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.searchAndBook")}
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
                  <CardTitle>{t("role.host")}</CardTitle>
                  <CardDescription>{t("onboarding.hostDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.hostDescLong")}
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
                  <CardTitle>{t("role.creator")}</CardTitle>
                  <CardDescription>{t("onboarding.creatorDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.creatorDescLong")}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  selectedRole === "jolly" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleRoleSelect("jolly")}
              >
                <CardHeader>
                  <CardTitle>{t("role.jolly")}</CardTitle>
                  <CardDescription>{t("onboarding.jollyDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("onboarding.offerServicesDesc")}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Button
              onClick={handleRoleSubmit}
              className="w-full"
              disabled={!selectedRole || loading}
            >
              {loading ? t("onboarding.saving") : t("general.continue")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Non mostrare più questo controllo qui - è già gestito sopra

  if (step === "role-specific" && selectedRole === "host") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        {profile?.role === "host" && (
          <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ {t("onboarding.alreadyRegistered")} <strong>{t("role.host")}</strong>. {t("onboarding.completeHost")}
              </p>
            </div>
          </div>
        )}
        <HostOnboarding redirectOnComplete="/dashbord/host" />
      </div>
    )
  }

  if (step === "role-specific" && selectedRole === "jolly") {
    return (
      <div className="min-h-screen">
        {profile?.role === "jolly" && (
          <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ {t("onboarding.alreadyRegistered")} <strong>{t("role.jolly")}</strong>. {t("onboarding.completeJolly")}
              </p>
            </div>
          </div>
        )}
        <JollyOnboarding redirectOnComplete="/dashboard/jolly" />
      </div>
    )
  }

  if (step === "role-specific" && selectedRole === "creator") {
    return (
      <div className="min-h-screen">
        {profile?.role === "creator" && (
          <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Registrato come <strong>Creator</strong>. Completa l&apos;onboarding per iniziare.
              </p>
            </div>
          </div>
        )}
        <CreatorOnboarding redirectOnComplete="/profile" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.loading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("onboarding.preparingDashboard")}</p>
        </CardContent>
      </Card>
    </div>
  )
}

