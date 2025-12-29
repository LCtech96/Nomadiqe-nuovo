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
import { put } from "@vercel/blob"
import ImageCropper from "@/components/image-cropper"
import { 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  Users, 
  ShoppingCart, 
  Camera,
  Wrench,
  ChefHat,
  Car,
  Languages,
  Building2,
  ArrowRight,
  Upload,
  User
} from "lucide-react"

type ManagerOnboardingStep = "guide" | "profile"

interface ManagerOnboardingProps {
  onComplete: () => void
}

export default function ManagerOnboarding({ onComplete }: ManagerOnboardingProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<ManagerOnboardingStep>("guide")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    avatarFile: null as File | null,
    avatarPreview: "",
  })

  // Load saved profile data on mount
  useEffect(() => {
    const loadSavedState = async () => {
      if (!session?.user?.id) return

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle()

        if (error) {
          console.error("Error loading profile:", error)
          return
        }

        if (profile) {
          setProfileData({
            fullName: profile.full_name || "",
            username: profile.username || "",
            avatarFile: null,
            avatarPreview: profile.avatar_url || "",
          })
        }
      } catch (error) {
        console.error("Error loading saved profile:", error)
      }
    }

    loadSavedState()
  }, [session?.user?.id, supabase])

  // Check username availability
  useEffect(() => {
    if (!profileData.username || profileData.username.trim().length === 0) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", profileData.username.toLowerCase().trim())
          .neq("id", session?.user?.id || "")
          .maybeSingle()

        if (error && error.code !== "PGRST116") throw error

        setUsernameAvailable(!data)
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [profileData.username, session?.user?.id, supabase])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Allow larger files (up to 10MB) since we'll crop and compress
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "L'immagine deve essere inferiore a 10MB",
          variant: "destructive",
        })
        return
      }
      // Open cropper instead of setting directly
      setAvatarFileToCrop(file)
      setShowAvatarCropper(true)
    }
    // Reset input
    e.target.value = ""
  }

  const handleAvatarCropComplete = (croppedFile: File) => {
    setProfileData({
      ...profileData,
      avatarFile: croppedFile,
      avatarPreview: URL.createObjectURL(croppedFile),
    })
    setShowAvatarCropper(false)
    setAvatarFileToCrop(null)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    // Validazione
    if (!profileData.fullName.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci il tuo nome completo",
        variant: "destructive",
      })
      return
    }

    if (!profileData.username.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci un username",
        variant: "destructive",
      })
      return
    }

    if (usernameAvailable === false) {
      toast({
        title: "Errore",
        description: "Username non disponibile. Scegline un altro.",
        variant: "destructive",
      })
      return
    }

    if (usernameAvailable === null && checkingUsername) {
      toast({
        title: "Attendere",
        description: "Verifica username in corso...",
      })
      return
    }

    setLoading(true)
    try {
      let avatarUrl = ""

      // Upload avatar if provided
      if (profileData.avatarFile) {
        try {
          const fileExtension = profileData.avatarFile.name.split(".").pop()
          const fileName = `${session.user.id}/avatar.${fileExtension}`
          
          const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || 
                           process.env.NEW_BLOB_READ_WRITE_TOKEN || 
                           process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || 
                           process.env.BLOB_READ_WRITE_TOKEN
          
          const blob = await put(fileName, profileData.avatarFile, {
            access: "public",
            contentType: profileData.avatarFile.type,
            token: blobToken,
          })
          avatarUrl = blob.url
        } catch (uploadError: any) {
          console.error("Avatar upload error:", uploadError)
          toast({
            title: "Attenzione",
            description: "Errore nel caricamento dell'avatar. Il profilo verrà salvato senza foto.",
          })
        }
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName,
          username: profileData.username.toLowerCase().trim(),
          avatar_url: avatarUrl || undefined,
          onboarding_completed: true,
        })
        .eq("id", session.user.id)

      if (error) throw error

      toast({
        title: "Profilo completato!",
        description: "Ora puoi iniziare a creare i tuoi servizi.",
      })

      // Reindirizza alla pagina per creare il primo servizio
      router.push("/dashboard/manager/services/new")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Guide step
  if (step === "guide") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-3xl">Benvenuto Manager!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Scopri come funziona la piattaforma per i manager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Introduzione */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-lg mb-2 text-blue-900 dark:text-blue-100">
                  Cosa puoi fare come Manager?
                </h3>
                <p className="text-blue-800 dark:text-blue-200">
                  Come Manager puoi offrire una vasta gamma di servizi agli host e ai viaggiatori della piattaforma. 
                  Crea il tuo profilo professionale e inizia a ricevere richieste!
                </p>
              </div>

              {/* Tipi di servizi */}
              <div>
                <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Tipi di Servizi che Puoi Offrire
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Gestione Proprietà</h4>
                          <p className="text-sm text-muted-foreground">
                            Gestisci prenotazioni, check-in/out, manutenzione e comunicazione con gli ospiti
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Pulizie</h4>
                          <p className="text-sm text-muted-foreground">
                            Servizi di pulizia professionale per strutture ricettive
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Fotografia & Video</h4>
                          <p className="text-sm text-muted-foreground">
                            Servizi fotografici e video per promuovere le proprietà
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                          <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Manutenzione</h4>
                          <p className="text-sm text-muted-foreground">
                            Riparazioni e manutenzione tecnica delle strutture
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                          <ChefHat className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Cucina</h4>
                          <p className="text-sm text-muted-foreground">
                            Servizi di catering e preparazione pasti
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                          <Car className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Autista</h4>
                          <p className="text-sm text-muted-foreground">
                            Servizi di trasporto e accompagnamento
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                          <Languages className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Traduzione</h4>
                          <p className="text-sm text-muted-foreground">
                            Servizi di traduzione e interpretariato
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                          <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Fornitore</h4>
                          <p className="text-sm text-muted-foreground">
                            Catalogo prodotti e forniture per strutture
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Come funziona */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Come Funziona
                </h3>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Completa il tuo profilo:</strong> Aggiungi foto, nome e username per rendere il tuo profilo professionale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Crea i tuoi servizi:</strong> Definisci i servizi che vuoi offrire, i prezzi e le zone di operatività</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Ricevi richieste:</strong> Gli host e i viaggiatori possono richiedere i tuoi servizi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Gestisci le richieste:</strong> Accetta o rifiuta le richieste e completa i servizi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Guadagna e cresci:</strong> Ricevi pagamenti e costruisci la tua reputazione sulla piattaforma</span>
                  </li>
                </ol>
              </div>

              {/* Prossimi passi */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-semibold text-lg mb-2 text-yellow-900 dark:text-yellow-100">
                  Prossimi Passi
                </h3>
                <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                  Dopo aver completato il tuo profilo personale, potrai creare i servizi che vuoi offrire. 
                  Ogni servizio può essere personalizzato con prezzi, descrizioni e zone di operatività.
                </p>
              </div>

              <Button
                onClick={() => setStep("profile")}
                className="w-full"
                size="lg"
              >
                Continua con il Profilo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Profile step
  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("guide")}
              >
                ← Indietro
              </Button>
            </div>
            <CardTitle className="text-2xl">Completa il tuo Profilo</CardTitle>
            <CardDescription>
              Aggiungi le informazioni essenziali per il tuo profilo professionale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Foto Profilo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profileData.avatarPreview ? (
                      <img
                        src={profileData.avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Label
                      htmlFor="avatar-upload"
                      className="cursor-pointer"
                    >
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Carica Foto
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formato: JPG, PNG. Max 10MB (ritaglio disponibile)
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, fullName: e.target.value })
                  }
                  placeholder="Es. Mario Rossi"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) =>
                      setProfileData({ ...profileData, username: e.target.value })
                    }
                    placeholder="Es. mario_rossi"
                    required
                    className="pr-20"
                  />
                  {checkingUsername && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      Verifica...
                    </span>
                  )}
                  {!checkingUsername && usernameAvailable !== null && (
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                        usernameAvailable
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {usernameAvailable ? "✓ Disponibile" : "✗ Non disponibile"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Il tuo username sarà visibile pubblicamente
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Prossimo passo:</strong> Dopo aver completato il profilo, potrai creare i servizi che vuoi offrire sulla piattaforma.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || checkingUsername || usernameAvailable === false}
              >
                {loading ? "Salvataggio..." : "Completa Profilo e Continua"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
        <ImageCropper
          open={showAvatarCropper}
          onOpenChange={setShowAvatarCropper}
          imageFile={avatarFileToCrop}
          onCropComplete={handleAvatarCropComplete}
          aspectRatio={1}
          maxWidth={800}
          maxHeight={800}
        />
      </>
  )
}
