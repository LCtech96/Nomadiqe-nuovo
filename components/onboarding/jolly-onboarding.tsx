"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

type JollyOnboardingStep = "guide" | "profile" | "services" | "website-offer"

interface JollyOnboardingProps {
  onComplete: () => void
}

export default function JollyOnboarding({ onComplete }: JollyOnboardingProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<JollyOnboardingStep>("guide")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    avatarFile: null as File | null,
    avatarPreview: "",
  })

  const SERVICE_TYPES = [
    "cleaning",
    "property_management",
    "photography",
    "videography",
    "maintenance",
    "concierge",
    "cooking",
    "driver",
    "translation",
  ] as const
  const SERVICE_TYPE_LABELS: Record<string, string> = {
    cleaning: "Pulizie",
    property_management: "Gestione proprietà",
    photography: "Fotografia",
    videography: "Video",
    maintenance: "Manutenzione",
    concierge: "Concierge",
    cooking: "Cucina",
    driver: "Autista",
    translation: "Traduzione",
  }

  // Services step data
  const [servicesData, setServicesData] = useState({
    service_type: "cleaning" as typeof SERVICE_TYPES[number],
    price_per_hour: "",
    price_per_service: "",
    location_country: "",
    location_city: "",
    hours_note: "",
  })

  // Website offer (Jolly: 399€ / 1399€)
  const [jollyCount, setJollyCount] = useState<number | null>(null)
  const [websiteOfferRequested, setWebsiteOfferRequested] = useState(false)
  const [showOfferDisclaimer, setShowOfferDisclaimer] = useState(false)

  // Resolve userId from session or Supabase
  useEffect(() => {
    const resolveUserId = async () => {
      if (session?.user?.id) {
        setUserId(session.user.id)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) setUserId(user.id)
    }
    resolveUserId()
  }, [session?.user?.id, supabase])

  // Load saved profile data on mount
  useEffect(() => {
    const loadSavedState = async () => {
      const uid = session?.user?.id ?? userId
      if (!uid) return

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", uid)
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
  }, [session?.user?.id, userId, supabase])

  // Check username availability
  useEffect(() => {
    if (!profileData.username || profileData.username.trim().length === 0) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        const uid = session?.user?.id ?? userId
        let query = supabase
          .from("profiles")
          .select("username")
          .eq("username", profileData.username.toLowerCase().trim())
        if (uid) query = query.neq("id", uid)
        const { data, error } = await query.maybeSingle()

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
  }, [profileData.username, session?.user?.id, userId, supabase])

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
    const uid = session?.user?.id ?? userId
    if (!uid) return

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
          const fileName = `${uid}/avatar.${fileExtension}`
          
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

      // Update profile (non completare onboarding ancora)
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName,
          username: profileData.username.toLowerCase().trim(),
          avatar_url: avatarUrl || undefined,
        })
        .eq("id", uid)

      if (error) throw error

      toast({
        title: "Profilo completato!",
        description: "Aggiungi il tipo di servizio che vuoi offrire.",
      })

      setStep("services")
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

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const uid = session?.user?.id ?? userId
    if (!uid) return

    if (!servicesData.location_country.trim() || !servicesData.location_city.trim()) {
      toast({
        title: "Campi obbligatori",
        description: "Inserisci regione/paese e città.",
        variant: "destructive",
      })
      return
    }

    const priceH = servicesData.price_per_hour ? parseFloat(servicesData.price_per_hour) : null
    const priceS = servicesData.price_per_service ? parseFloat(servicesData.price_per_service) : null
    if (!priceH && !priceS) {
      toast({
        title: "Prezzo obbligatorio",
        description: "Inserisci prezzo per ora o a servizio.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const title = SERVICE_TYPE_LABELS[servicesData.service_type] || servicesData.service_type
      const desc = servicesData.hours_note.trim()
        ? `Orari: ${servicesData.hours_note.trim()}`
        : ""

      const { error } = await supabase.from("manager_services").insert({
        manager_id: uid,
        service_type: servicesData.service_type,
        title,
        description: desc || null,
        price_per_hour: priceH,
        price_per_service: priceS,
        availability_type: "flexible",
        operating_countries: [servicesData.location_country.trim()],
        operating_cities: [servicesData.location_city.trim()],
        location_country: servicesData.location_country.trim(),
        location_city: servicesData.location_city.trim(),
        skills: [],
        portfolio_images: [],
      })

      if (error) throw error

      toast({ title: "Servizio aggiunto!", description: "Passo all'offerta sito web." })
      setStep("website-offer")
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Errore nel salvataggio del servizio.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJollyWebsiteOfferRequest = async () => {
    const uid = session?.user?.id ?? userId
    if (!uid) return

    setLoading(true)
    try {
      const count = jollyCount ?? 0
      const isFirst100 = count < 100
      const offerPrice = isFirst100 ? 399 : 1399

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", uid)
        .maybeSingle()

      await fetch("/api/website-offer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: uid,
          hostEmail: profile?.email || session?.user?.email || "",
          hostName: profile?.full_name || session?.user?.name || "",
          offerPrice,
          isFirst100,
          role: "jolly",
        }),
      })

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", uid)
      if (error) console.warn("onboarding_completed update:", error)

      setWebsiteOfferRequested(true)
      setShowOfferDisclaimer(true)
      toast({
        title: "Richiesta inviata",
        description: "Verrai contattato. Ti reindirizziamo alla Home.",
      })
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Errore nell'invio della richiesta.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJollyWebsiteOfferSkip = async () => {
    const uid = session?.user?.id ?? userId
    if (!uid) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", uid)
      if (error) console.warn("onboarding_completed update:", error)

      toast({ title: "Onboarding completato", description: "Redirect alla Home." })
      router.push("/home")
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Errore.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showOfferDisclaimer) return
    const t = setTimeout(() => {
      setShowOfferDisclaimer(false)
      router.push("/home")
    }, 2000)
    return () => clearTimeout(t)
  }, [showOfferDisclaimer, router])

  useEffect(() => {
    if (step !== "website-offer") return
    const load = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "jolly")
      setJollyCount(count ?? 0)
    }
    load()
  }, [step, supabase])

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
              <CardTitle className="text-3xl">Benvenuto Jolly!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Scopri come funziona la piattaforma per i jolly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Introduzione */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-lg mb-2 text-blue-900 dark:text-blue-100">
                  Cosa puoi fare come Jolly?
                </h3>
                <p className="text-blue-800 dark:text-blue-200">
                  Come Jolly puoi offrire una vasta gamma di servizi agli host e ai viaggiatori della piattaforma. 
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

  // Services step
  if (step === "services") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("profile")}>
                  ← Indietro
                </Button>
              </div>
              <CardTitle className="text-2xl">Servizi che offri</CardTitle>
              <CardDescription>
                Tipo di servizio, prezzo, regione, città e orari
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleServicesSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo servizio *</Label>
                  <Select
                    value={servicesData.service_type}
                    onValueChange={(v) =>
                      setServicesData({ ...servicesData, service_type: v as typeof servicesData.service_type })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {SERVICE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_h">Prezzo (€/ora)</Label>
                    <Input
                      id="price_h"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Es. 25"
                      value={servicesData.price_per_hour}
                      onChange={(e) =>
                        setServicesData({ ...servicesData, price_per_hour: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_s">Prezzo (€/servizio)</Label>
                    <Input
                      id="price_s"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Es. 80"
                      value={servicesData.price_per_service}
                      onChange={(e) =>
                        setServicesData({ ...servicesData, price_per_service: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Inserisci almeno uno tra prezzo per ora o a servizio.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="region">Regione / Paese *</Label>
                  <Input
                    id="region"
                    value={servicesData.location_country}
                    onChange={(e) =>
                      setServicesData({ ...servicesData, location_country: e.target.value })
                    }
                    placeholder="Es. Italia"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    value={servicesData.location_city}
                    onChange={(e) =>
                      setServicesData({ ...servicesData, location_city: e.target.value })
                    }
                    placeholder="Es. Roma"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Orari (es. Lun–Ven 9–18)</Label>
                  <Textarea
                    id="hours"
                    value={servicesData.hours_note}
                    onChange={(e) =>
                      setServicesData({ ...servicesData, hours_note: e.target.value })
                    }
                    placeholder="Es. Lun–Ven 9–18, Sabato su appuntamento"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Salvataggio..." : "Continua →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Website offer step (399€ / 1399€)
  if (step === "website-offer") {
    const isFirst100 = (jollyCount ?? 0) < 100
    const offerPrice = isFirst100 ? 399 : 1399
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#111827] dark:to-[#111827]">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Offerta Speciale Sito Web</CardTitle>
              <CardDescription>
                Crea il tuo sito web personalizzato – offerta per i primi 100 Jolly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  Sito web per la tua attività
                </h2>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {isFirst100
                    ? "Ai primi 100 Jolly iscritti offriamo il sito a 399€ (dominio e hosting inclusi)."
                    : "Dopo i primi 100, l'offerta è 1399€ (dominio e hosting inclusi)."}
                </p>
                <p className="font-bold text-lg">{offerPrice}€</p>
                {isFirst100 && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    ✓ Offerta valida solo per i primi 100 Jolly
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleJollyWebsiteOfferRequest}
                  className="flex-1 whitespace-normal text-center py-3"
                  disabled={loading || websiteOfferRequested}
                  size="lg"
                >
                  {websiteOfferRequested ? "Richiesta Inviata" : "Richiedi Offerta"}
                </Button>
                <Button
                  onClick={handleJollyWebsiteOfferSkip}
                  variant="outline"
                  className="flex-1 whitespace-normal text-center py-3"
                  disabled={loading}
                  size="lg"
                >
                  Richiedimelo successivamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Dialog open={showOfferDisclaimer} onOpenChange={setShowOfferDisclaimer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Richiesta Inviata</DialogTitle>
              <DialogDescription>
                Verrai contattato. Ti reindirizziamo alla Home.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowOfferDisclaimer(false)
                  router.push("/home")
                }}
              >
                Vai alla Home
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Profile step
  if (step === "profile") {
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
                  <strong>Prossimo passo:</strong> Inserisci il tipo di servizio che vuoi offrire, prezzo, regione, città e orari.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || checkingUsername || usernameAvailable === false}
              >
                {loading ? "Salvataggio..." : "Completa Profilo e Continua →"}
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

  return null
}
