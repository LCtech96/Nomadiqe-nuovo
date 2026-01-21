"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Circle, 
  UserPlus, 
  FileText, 
  Image as ImageIcon, 
  Heart,
  ArrowRight,
  Sparkles,
  Users,
  Camera,
  Share2
} from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface GuideStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  completed: boolean
  points: number
}

interface InteractiveGuideProps {
  onComplete: () => void
}

export default function InteractiveGuide({ onComplete }: InteractiveGuideProps) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<GuideStep[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false)

  // Carica l'utente Supabase direttamente (più affidabile dopo verifica email)
  useEffect(() => {
    const loadSupabaseUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (user && !error) {
          setSupabaseUser(user)
        } else if (error) {
          console.error("Error loading Supabase user:", error)
        }
      } catch (error) {
        console.error("Error loading Supabase user:", error)
      }
    }
    loadSupabaseUser()
  }, [])

  useEffect(() => {
    // Evita chiamate multiple
    if (profileLoadAttempted) return

    // Usa l'utente Supabase se disponibile, altrimenti aspetta la sessione NextAuth
    const userId = supabaseUser?.id || session?.user?.id
    
    if (userId) {
      setProfileLoadAttempted(true)
      loadProfile(userId)
    } else if (sessionStatus === "unauthenticated") {
      // Se non autenticato, reindirizza al login
      router.push("/auth/signin")
      setLoading(false)
    } else if (sessionStatus === "loading") {
      // Aspetta che la sessione carichi - non fare nulla
      return
    }
    // Se non abbiamo userId e la sessione non è loading, aspetta che supabaseUser si carichi
  }, [session, sessionStatus, supabaseUser, profileLoadAttempted])

  // Timeout di sicurezza: se dopo 5 secondi non abbiamo ancora caricato, inizializza comunque
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && steps.length === 0) {
        console.warn("Timeout loading guide, initializing with default steps")
        const defaultSteps: GuideStep[] = [
          {
            id: "role",
            title: "Scegli il tuo ruolo",
            description: "Seleziona come vuoi utilizzare Nomadiqe",
            icon: <Users className="w-6 h-6" />,
            action: () => router.push("/onboarding"),
            completed: false,
            points: 75
          },
          {
            id: "profile",
            title: "Completa il tuo profilo",
            description: "Aggiungi nome, username, bio e avatar",
            icon: <FileText className="w-6 h-6" />,
            action: () => router.push("/profile"),
            completed: false,
            points: 50
          },
          {
            id: "follow",
            title: "Segui altri utenti",
            description: "Inizia a seguire altri utenti",
            icon: <UserPlus className="w-6 h-6" />,
            action: () => router.push("/feed"),
            completed: false,
            points: 10
          },
          {
            id: "post",
            title: "Crea il tuo primo post",
            description: "Condividi le tue esperienze",
            icon: <Share2 className="w-6 h-6" />,
            action: () => router.push("/feed"),
            completed: false,
            points: 15
          },
          {
            id: "photo",
            title: "Carica una foto",
            description: "Aggiungi foto al tuo profilo",
            icon: <Camera className="w-6 h-6" />,
            action: () => router.push("/profile"),
            completed: false,
            points: 20
          }
        ]
        setSteps(defaultSteps)
        setLoading(false)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [loading, steps.length])

  const loadProfile = async (userId?: string) => {
    // Usa l'ID fornito, o prova a ottenerlo dalla sessione o da Supabase
    const currentUserId = userId || supabaseUser?.id || session?.user?.id
    
    if (!currentUserId) {
      // Se non abbiamo un ID utente, aspetta un po' e riprova
      console.log("No user ID available, waiting...")
      setTimeout(() => {
        if (loading) {
          const retryUserId = supabaseUser?.id || session?.user?.id
          if (retryUserId) {
            loadProfile(retryUserId)
          } else {
            // Se dopo 3 secondi non abbiamo ancora l'ID, inizializza comunque
            console.log("No user ID after wait, initializing with null profile")
            initializeSteps(null)
            setLoading(false)
          }
        }
      }, 1000)
      return
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
      }

      if (data) {
        setProfile(data)
        await initializeSteps(data, currentUserId)
      } else {
        // Se non c'è profilo, inizializza comunque gli step (tutti non completati)
        await initializeSteps(null, currentUserId)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      // In caso di errore, inizializza comunque gli step
      await initializeSteps(null, currentUserId)
    } finally {
      setLoading(false)
    }
  }

  const initializeSteps = async (profileData: any, userId?: string) => {
    const currentUserId = userId || supabaseUser?.id || session?.user?.id
    if (!currentUserId) {
      console.warn("No user ID available for initializing steps")
      // Inizializza comunque gli step senza verifiche dinamiche
      const defaultSteps: GuideStep[] = [
        {
          id: "role",
          title: "Scegli il tuo ruolo",
          description: "Seleziona come vuoi utilizzare Nomadiqe",
          icon: <Users className="w-6 h-6" />,
          action: () => router.push("/onboarding"),
          completed: false,
          points: 75
        },
        {
          id: "profile",
          title: "Completa il tuo profilo",
          description: "Aggiungi nome, username, bio e avatar",
          icon: <FileText className="w-6 h-6" />,
          action: () => router.push("/profile"),
          completed: false,
          points: 50
        },
        {
          id: "follow",
          title: "Segui altri utenti",
          description: "Inizia a seguire altri utenti",
          icon: <UserPlus className="w-6 h-6" />,
          action: () => router.push("/feed"),
          completed: false,
          points: 10
        },
        {
          id: "post",
          title: "Crea il tuo primo post",
          description: "Condividi le tue esperienze",
          icon: <Share2 className="w-6 h-6" />,
          action: () => router.push("/feed"),
          completed: false,
          points: 15
        },
        {
          id: "photo",
          title: "Carica una foto",
          description: "Aggiungi foto al tuo profilo",
          icon: <Camera className="w-6 h-6" />,
          action: () => router.push("/profile"),
          completed: false,
          points: 20
        }
      ]
      setSteps(defaultSteps)
      return
    }

    // Descrizioni specifiche per ruolo
    const roleDescriptions: Record<string, string> = {
      traveler: "Completa il tuo profilo da Traveler: aggiungi nome, username, bio e avatar per connetterti con altri viaggiatori e scoprire nuove destinazioni",
      creator: "Completa il tuo profilo da Creator: aggiungi informazioni sui tuoi social media, nicchie di contenuto e portfolio per attirare collaborazioni",
      host: "Completa il tuo profilo da Host: aggiungi informazioni sulla tua struttura, servizi offerti e preferenze per collaborazioni con creator",
      jolly: "Completa il tuo profilo da Jolly: aggiungi informazioni sui servizi che offri (pulizie, gestione, fotografia, etc.) per trovare clienti"
    }

    const profileDescription = profileData?.role 
      ? roleDescriptions[profileData.role] || "Aggiungi nome, username, bio e avatar per far conoscere meglio te e la tua attività"
      : "Aggiungi nome, username, bio e avatar per far conoscere meglio te e la tua attività"

    // Verifica dinamicamente lo stato attuale invece di basarsi sui dati cached
    const [hasRole, hasProfile, hasFollows, hasPosts, hasAvatar] = await Promise.all([
      // Verifica ruolo
      Promise.resolve(!!profileData?.role),
      // Verifica profilo completo
      Promise.resolve(!!(profileData?.full_name && profileData?.username)),
      // Verifica se ha seguito qualcuno
      (async () => {
        try {
          const { count } = await supabase
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("follower_id", currentUserId)
          return (count || 0) > 0
        } catch {
          return false
        }
      })(),
      // Verifica se ha creato un post
      (async () => {
        try {
          const { count } = await supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("author_id", currentUserId)
          return (count || 0) > 0
        } catch {
          return false
        }
      })(),
      // Verifica se ha un avatar
      Promise.resolve(!!profileData?.avatar_url)
    ])

    const guideSteps: GuideStep[] = [
      {
        id: "role",
        title: "Scegli il tuo ruolo",
        description: "Seleziona come vuoi utilizzare Nomadiqe: Traveler (viaggia e scopri), Creator (collabora con host), Host (pubblica strutture) o Jolly (offri servizi)",
        icon: <Users className="w-6 h-6" />,
        action: () => router.push("/onboarding"),
        completed: hasRole,
        points: 75
      },
      {
        id: "profile",
        title: "Completa il tuo profilo",
        description: profileDescription,
        icon: <FileText className="w-6 h-6" />,
        action: () => {
          // Assicurati di navigare sempre al profilo dell'utente corrente
          const userId = supabaseUser?.id || session?.user?.id
          if (userId) {
            router.push("/profile")
          }
        },
        completed: hasProfile,
        points: 50
      },
      {
        id: "follow",
        title: "Segui altri utenti",
        description: "Inizia a seguire altri viaggiatori, creator e host per rimanere aggiornato",
        icon: <UserPlus className="w-6 h-6" />,
        action: () => router.push("/feed"),
        completed: hasFollows,
        points: 10
      },
      {
        id: "post",
        title: "Crea il tuo primo post",
        description: "Condividi le tue esperienze, foto e pensieri con la community",
        icon: <Share2 className="w-6 h-6" />,
        action: () => router.push("/feed"),
        completed: hasPosts,
        points: 15
      },
      {
        id: "photo",
        title: "Carica una foto",
        description: "Aggiungi foto al tuo profilo o ai tuoi post per rendere il tuo profilo più attraente",
        icon: <Camera className="w-6 h-6" />,
        action: () => {
          // Assicurati di navigare sempre al profilo dell'utente corrente
          const userId = supabaseUser?.id || session?.user?.id
          if (userId) {
            router.push("/profile")
          }
        },
        completed: hasAvatar,
        points: 20
      }
    ]

    setSteps(guideSteps)
  }

  // Rimuoviamo questa funzione perché ora verifichiamo tutto in initializeSteps

  const handleStepComplete = async (step: GuideStep) => {
    // Aggiorna lo stato del passo come completato
    const updatedSteps = steps.map(s => 
      s.id === step.id ? { ...s, completed: true } : s
    )
    setSteps(updatedSteps)

    // Assegna punti se non già assegnati
    if (!session?.user?.id) return
    
    try {
      const { data: existing } = await supabase
        .from("points_history")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("action_type", "guide_step")
        .eq("description", step.id)
        .maybeSingle()

      if (!existing) {
        // Add points history
        const { error: historyError } = await supabase.from("points_history").insert({
          user_id: session.user.id,
          points: step.points,
          action_type: "guide_step",
          description: step.id,
        })

        if (historyError) {
          console.error("Error inserting points history:", historyError)
          return
        }

        // Update user points
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", session.user.id)
          .single()

        if (fetchError) {
          console.error("Error fetching profile:", fetchError)
          return
        }

        if (profile) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) + step.points })
            .eq("id", session.user.id)

          if (updateError) {
            console.error("Error updating profile points:", updateError)
          }
        }

        toast({
          title: "Punti guadagnati!",
          description: `Hai guadagnato ${step.points} punti per ${step.title}`,
        })
      }
    } catch (error) {
      console.error("Error awarding points:", error)
    }
  }

  const completedSteps = steps.filter(s => s.completed).length
  const totalSteps = steps.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <p>Caricamento guida...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (steps.length === 0) {
    return null
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Guida Interattiva
              </CardTitle>
              <CardDescription className="mt-2">
                Completa questi passi per iniziare a guadagnare punti e sfruttare al meglio Nomadiqe
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {completedSteps}/{totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step corrente */}
          <div className="p-6 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                {currentStepData.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{currentStepData.title}</h3>
                  {currentStepData.completed && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-muted-foreground mb-4">{currentStepData.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {currentStepData.points} punti
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      currentStepData.action()
                      if (!currentStepData.completed) {
                        handleStepComplete(currentStepData)
                      }
                    }}
                    className="flex-1"
                  >
                    {currentStepData.completed ? "Vai alla sezione" : "Inizia"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {currentStepData.completed && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentStep < steps.length - 1) {
                          setCurrentStep(currentStep + 1)
                        }
                      }}
                    >
                      Avanti
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista di tutti gli step */}
          <div className="space-y-2">
            <h4 className="font-semibold mb-3">Tutti i passi:</h4>
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  index === currentStep
                    ? "border-primary bg-primary/5"
                    : step.completed
                    ? "border-green-200 bg-green-50 dark:bg-green-900/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="flex items-center gap-3">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{step.title}</span>
                      <Badge variant="outline" className="text-xs">
                        +{step.points}pt
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Azioni finali */}
          {completedSteps === totalSteps && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  Complimenti! Hai completato tutti i passi!
                </h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                Ora puoi iniziare a esplorare Nomadiqe e guadagnare ancora più punti.
              </p>
              <Button onClick={onComplete} className="w-full">
                Inizia a esplorare
              </Button>
            </div>
          )}

          {completedSteps < totalSteps && (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={onComplete}>
                Salta la guida per ora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
