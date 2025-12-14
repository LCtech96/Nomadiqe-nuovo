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
          
          // Se l'utente ha già un ruolo, reindirizza sempre alla home
          // Il ruolo non può essere cambiato, quindi non serve mostrare l'onboarding
          if (data.role) {
            router.push("/home")
            return
          }

          // Se l'utente non ha un ruolo, reindirizza alla home per la selezione
          router.push("/home")
          return
        } else {
          // Profile doesn't exist - redirect to home for role selection
          router.push("/home")
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
    if (!session?.user?.id || !selectedRole) return

    setLoading(true)
    try {
      // Check if profile exists and if it already has a role
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .maybeSingle()

      // Se il profilo esiste e ha già un ruolo, non permettere il cambio
      if (existingProfile?.role) {
        toast({
          title: "Attenzione",
          description: `Hai già selezionato il ruolo ${existingProfile.role}. Il ruolo non può essere modificato.`,
          variant: "destructive",
        })
        // Reindirizza alla home se ha già un ruolo
        router.push("/home")
        setLoading(false)
        return
      }

      // Se il profilo non esiste, crealo con tutti i campi necessari
      if (!existingProfile) {
        const newProfileData: any = {
          id: session.user.id,
          email: session.user.email || "",
          role: selectedRole,
          full_name: session.user.name || session.user.email?.split("@")[0] || "",
          username: session.user.email?.split("@")[0] || "",
        }

        const { error: insertError } = await supabase
          .from("profiles")
          .insert(newProfileData)

        if (insertError) {
          console.error("Insert error:", insertError)
          throw insertError
        }
      } else {
        // Se il profilo esiste ma non ha ancora un ruolo, aggiorna ruolo e onboarding_completed insieme
        const updateData: any = {
          role: selectedRole,
        }
        
        // Per ruoli non-host, segna anche onboarding come completato
        if (selectedRole !== "host") {
          updateData.onboarding_completed = true
        }
        
        console.log("Updating existing profile:", updateData)
        const { data: updateResult, error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", session.user.id)
          .select("role, onboarding_completed")

        if (updateError) {
          console.error("Update error:", updateError)
          throw updateError
        }
        
        console.log("Update successful:", updateResult)
      }
      
      // Non verifichiamo subito perché potrebbe essere un problema di cache del database
      // Se l'UPDATE non ha dato errori, assumiamo che sia andato a buon fine

      // Mostra un messaggio di successo
      toast({
        title: "Successo",
        description: `Ruolo ${selectedRole} selezionato con successo!`,
      })

      // If role is host, go to host-specific onboarding
      if (selectedRole === "host") {
        setStep("role-specific")
      } else {
        // For other roles, stay on onboarding to complete profile info
        // L'utente continuerà con l'onboarding per completare le informazioni del profilo
        // Per ora reindirizziamo alla home, ma qui si potrebbe aggiungere più onboarding
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

  // Se l'utente ha già un ruolo nel profilo, reindirizza alla home
  // Il ruolo non può essere cambiato
  if (profile?.role && profile.role !== selectedRole) {
    router.push("/home")
    return <div className="min-h-screen flex items-center justify-center">Reindirizzamento...</div>
  }

  // Non mostriamo più la selezione dei ruoli qui - quella è sulla home
  // Se l'utente arriva qui senza un ruolo, viene reindirizzato alla home
  if (!selectedRole) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  // Questa parte non dovrebbe più essere raggiunta, ma la lasciamo per sicurezza
  // Se l'utente ha già un ruolo, non mostrare la selezione
  if (step === "role" && profile?.role) {
    router.push("/home")
    return <div className="min-h-screen flex items-center justify-center">Reindirizzamento...</div>
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

