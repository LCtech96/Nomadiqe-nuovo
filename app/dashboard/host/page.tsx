"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { Plus, Home, Users, Settings, Save, MessageSquare, UserPlus, CheckCircle, Clock, XCircle, Trash2, MapPin, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import HostAvailabilityCalendar from "@/components/host-availability-calendar"

interface Property {
  id: string
  name: string
  title?: string
  city: string
  country: string
  price_per_night: number
  is_active: boolean
  booking_count: number
  images?: string[] | null
}

interface KOLBedPreferences {
  free_stay_nights: number
  promotion_types: string[]
  required_social_platforms: string[]
  additional_requirements: string | null
}

export default function HostDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [preferences, setPreferences] = useState<KOLBedPreferences>({
    free_stay_nights: 0,
    promotion_types: [],
    required_social_platforms: [],
    additional_requirements: null,
  })
  const [freeStayNightsInput, setFreeStayNightsInput] = useState<string>("")
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [showPreferencesForm, setShowPreferencesForm] = useState(false)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [activeReferralsCount, setActiveReferralsCount] = useState(0)
  const [collaborations, setCollaborations] = useState<any[]>([])
  const [loadingCollaborations, setLoadingCollaborations] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hostCount, setHostCount] = useState<number | null>(null)
  const [websiteOfferRequested, setWebsiteOfferRequested] = useState(false)
  const [requestingWebsiteOffer, setRequestingWebsiteOffer] = useState(false)

  const loadPropertiesWithUserId = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", { ascending: false })

      if (error) throw error

      const propertiesWithBookings = await Promise.all(
        (data || []).map(async (property) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id)
            .eq("status", "confirmed")

          return {
            ...property,
            booking_count: count || 0,
          }
        })
      )

      setProperties(propertiesWithBookings)
    } catch (error) {
      console.error("Error loading properties:", error)
      setProperties([])
    }
  }

  const loadPreferencesWithUserId = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("host_kol_bed_preferences")
        .select("*")
        .eq("host_id", id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        const nights = data.free_stay_nights ?? null
        setPreferences({
          free_stay_nights: nights ?? 0,
          promotion_types: data.promotion_types || [],
          required_social_platforms: data.required_social_platforms || [],
          additional_requirements: data.additional_requirements || null,
        })
        setFreeStayNightsInput(nights !== null && nights !== undefined ? nights.toString() : "")
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    }
  }

  const loadReferralsWithUserId = async (id: string) => {
    setLoadingReferrals(true)
    try {
      const { data, error } = await supabase
        .from("host_referrals")
        .select("*")
        .eq("host_id", id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setReferrals(data || [])
      const activeCount = (data || []).filter(
        (r) => r.status === "profile_created" || r.status === "first_booking_received"
      ).length
      setActiveReferralsCount(activeCount)
    } catch (error) {
      console.error("Error loading referrals:", error)
    } finally {
      setLoadingReferrals(false)
    }
  }

  const loadCollaborationsWithUserId = async (id: string) => {
    setLoadingCollaborations(true)
    try {
      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          id,
          creator_id,
          property_id,
          status,
          collaboration_type,
          start_date,
          end_date,
          created_at,
          creator:profiles!collaborations_creator_id_fkey(id, username, full_name, avatar_url),
          property:properties(id, name, title, images, city, country)
        `)
        .eq("host_id", id)
        .in("status", ["accepted", "completed"])
        .order("created_at", { ascending: false })

      if (error) throw error

      const mappedCollaborations = (data || [])
        .filter((c: any) => c.property)
        .map((c: any) => {
          const property = Array.isArray(c.property) ? c.property[0] : c.property
          const creator = Array.isArray(c.creator) ? c.creator[0] : c.creator
          return {
            id: c.id,
            creator_id: c.creator_id,
            property_id: c.property_id,
            status: c.status,
            collaboration_type: c.collaboration_type,
            start_date: c.start_date,
            end_date: c.end_date,
            created_at: c.created_at,
            creator,
            property,
          }
        })

      setCollaborations(mappedCollaborations)
    } catch (error) {
      console.error("Error loading collaborations:", error)
    } finally {
      setLoadingCollaborations(false)
    }
  }

  useEffect(() => {
    const checkOnboarding = async () => {
      if (status === "unauthenticated") {
        router.push("/auth/signin")
        return
      }
      if (status !== "authenticated") return

      let currentUserId: string | null = session?.user?.id ?? null
      if (!currentUserId) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser()
        currentUserId = supabaseUser?.id || null
      }

      if (!currentUserId) {
        router.push("/auth/signin")
        setCheckingOnboarding(false)
        setLoading(false)
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", currentUserId)
          .maybeSingle()

        if (error) {
          console.error("Error checking profile:", error)
          setCheckingOnboarding(false)
          setLoading(false)
          return
        }

        if (profile?.role !== "host") {
          setCheckingOnboarding(false)
          setLoading(false)
          router.push("/onboarding")
          return
        }

        if (profile && !profile.onboarding_completed) {
          setCheckingOnboarding(false)
          setLoading(false)
          router.push("/onboarding")
          return
        }

        setUserId(currentUserId)
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "host")
        setHostCount(count || 0)
        const { data: existingOffer } = await supabase
          .from("website_offer_requests")
          .select("id")
          .eq("host_id", currentUserId)
          .maybeSingle()
        setWebsiteOfferRequested(!!existingOffer)
        await Promise.allSettled([
          loadPropertiesWithUserId(currentUserId),
          loadPreferencesWithUserId(currentUserId),
          loadReferralsWithUserId(currentUserId),
          loadCollaborationsWithUserId(currentUserId),
        ])
      } catch (error) {
        console.error("Error in checkOnboarding:", error)
      } finally {
        setCheckingOnboarding(false)
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [session, status, router, supabase])

  if (checkingOnboarding || status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#111827] dark:to-[#111827]">
        <div>Caricamento...</div>
      </div>
    )
  }

  const loadProperties = async () => {
    if (!userId) return
    return loadPropertiesWithUserId(userId)
  }

  const handleDeleteProperty = async () => {
    if (!propertyToDelete || !userId) return

    setDeleting(true)
    try {
      // Usa l'API route server-side per eliminare la proprietà (bypassa problemi di autenticazione Supabase)
      const response = await fetch(`/api/properties/delete?id=${propertyToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore nell'eliminazione della struttura")
      }

      toast({
        title: "Successo",
        description: "Struttura eliminata definitivamente",
      })

      setShowDeleteDialog(false)
      setPropertyToDelete(null)
      
      // Rimuovi immediatamente la proprietà dalla lista locale per feedback istantaneo
      setProperties((prev) => prev.filter((p) => p.id !== propertyToDelete))
      
      // Ricarica le proprietà dal server per sincronizzazione
      await loadProperties()
    } catch (error: any) {
      console.error("Error deleting property:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile eliminare la struttura",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (propertyId: string) => {
    setPropertyToDelete(propertyId)
    setShowDeleteDialog(true)
  }

  const loadPreferences = async () => {
    if (!userId) return
    return loadPreferencesWithUserId(userId)
  }

  const handleSavePreferences = async () => {
    if (!userId) return

    setSavingPreferences(true)
    try {
      const nightsValue = freeStayNightsInput.trim() === "" ? null : parseInt(freeStayNightsInput)
      
      const { error } = await supabase
        .from("host_kol_bed_preferences")
        .upsert(
          {
            host_id: userId || "",
            free_stay_nights: nightsValue ?? 0,
            promotion_types: preferences.promotion_types,
            required_social_platforms: preferences.required_social_platforms,
            additional_requirements: preferences.additional_requirements || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "host_id" }
        )

      if (error) throw error

      toast({
        title: "Successo",
        description: "Preferenze KOL&BED salvate con successo!",
      })

      setShowPreferencesForm(false)
    } catch (error: any) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare le preferenze",
        variant: "destructive",
      })
    } finally {
      setSavingPreferences(false)
    }
  }

  const togglePromotionType = (type: string) => {
    setPreferences((prev) => ({
      ...prev,
      promotion_types: prev.promotion_types.includes(type)
        ? prev.promotion_types.filter((t) => t !== type)
        : [...prev.promotion_types, type],
    }))
  }

  const toggleSocialPlatform = (platform: string) => {
    setPreferences((prev) => ({
      ...prev,
      required_social_platforms: prev.required_social_platforms.includes(platform)
        ? prev.required_social_platforms.filter((p) => p !== platform)
        : [...prev.required_social_platforms, platform],
    }))
  }

  const loadReferrals = async () => {
    if (!userId) return
    return loadReferralsWithUserId(userId)
  }

  const loadCollaborations = async () => {
    if (!userId) return
    return loadCollaborationsWithUserId(userId)
  }

  const handleWebsiteOfferRequest = async () => {
    if (!userId) return
    setRequestingWebsiteOffer(true)
    try {
      const isFirst100 = (hostCount || 0) < 100
      const offerPrice = isFirst100 ? 299 : 799
      const { error } = await supabase.from("website_offer_requests").insert({
        host_id: userId,
        status: "pending",
        offer_price: offerPrice,
        is_first_100: isFirst100,
      })
      if (error) throw error
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).maybeSingle()
      await fetch("/api/website-offer/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: userId,
          hostEmail: profile?.email || session?.user?.email || "",
          hostName: profile?.full_name || session?.user?.name || "",
          offerPrice,
          isFirst100,
          role: "host",
        }),
      })
      setWebsiteOfferRequested(true)
      toast({ title: "Richiesta inviata", description: "Verrai contattato nei prossimi giorni." })
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message || "Richiesta fallita", variant: "destructive" })
    } finally {
      setRequestingWebsiteOffer(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <div>Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#111827] p-8">
      <div className="container mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Host</h1>
            <p className="text-muted-foreground">Gestisci le tue strutture</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/host/properties/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuova struttura
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Strutture totali</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{properties.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strutture attive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {properties.filter((p) => p.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Host invitati attivi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeReferralsCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Le tue strutture - subito dopo le statistiche */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Le tue strutture</CardTitle>
            <CardDescription>
              Gestisci le tue proprietà: modificale o eliminale dalla dashboard. Sono visibili anche in Esplora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <div className="text-center py-8">
                <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Non hai ancora pubblicato nessuna struttura
                </p>
                <Button asChild>
                  <Link href="/dashboard/host/properties/new">Crea la prima struttura</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => (
                  <Card key={property.id} className="overflow-hidden">
                    <div className="relative w-full h-40 overflow-hidden bg-muted">
                      {property.images && property.images.length > 0 ? (
                        <Image
                          src={property.images[0]}
                          alt={property.name || property.title || "Struttura"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-sm font-bold">
                        €{property.price_per_night}/notte
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{property.name || property.title}</CardTitle>
                      <CardDescription>
                        {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Users className="w-4 h-4" />
                        <span>{property.booking_count} prenotazioni</span>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1" size="sm">
                          <Link href={`/dashboard/host/properties/${property.id}`}>
                            Modifica
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1" size="sm">
                          <Link href={`/properties/${property.id}`}>Vedi</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() => openDeleteDialog(property.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendario disponibilità */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario disponibilità
            </CardTitle>
            <CardDescription>
              Gestisci le date: clic singolo per aprire/chiudere, doppio clic per KOL&BED
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HostAvailabilityCalendar
              hostId={userId || ""}
              propertyIds={properties.map((p) => ({
                id: p.id,
                name: p.name || p.title || "Struttura",
              }))}
              propertiesWithSync={properties.map((p) => ({
                id: p.id,
                name: p.name || p.title || "Struttura",
                airbnb_ical_url: (p as any).airbnb_ical_url,
                booking_ical_url: (p as any).booking_ical_url,
              }))}
              supabase={supabase}
            />
          </CardContent>
        </Card>

        {/* Referrals Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Inviti Host</CardTitle>
            <CardDescription>
              Visualizza lo stato degli utenti che hai invitato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReferrals ? (
              <div className="text-center py-4">Caricamento...</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Non hai ancora invitato nessun utente
                </p>
                <p className="text-sm text-muted-foreground">
                  Vai su Impostazioni nel menu per generare un link di invito
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {referral.invited_email || "Email non disponibile"}
                        </p>
                        {referral.invited_phone && (
                          <p className="text-sm text-muted-foreground">
                            {referral.invited_phone}
                          </p>
                        )}
                        {referral.invited_role && (
                          <p className="text-xs text-muted-foreground">
                            Ruolo: {referral.invited_role}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {referral.status === "pending" && (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                        {referral.status === "waitlist_registered" && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                        {referral.status === "approved" && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {referral.status === "profile_created" && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {referral.status === "first_booking_received" && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                        <span className="text-sm font-medium">
                          {referral.status === "pending" && "In attesa"}
                          {referral.status === "waitlist_registered" && "Registrato"}
                          {referral.status === "approved" && "Approvato"}
                          {referral.status === "profile_created" && "Profilo creato"}
                          {referral.status === "first_booking_received" && "Prima prenotazione"}
                        </span>
                      </div>
                    </div>
                    {referral.registered_at && (
                      <p className="text-xs text-muted-foreground">
                        Registrato: {new Date(referral.registered_at).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offerta Sito Web */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Offerta Speciale Sito Web</CardTitle>
            <CardDescription>
              Annulla la dipendenza dalle piattaforme OTA con un sito personalizzato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Nomadiqe ti aiuta a realizzare un sito web su misura {(hostCount || 0) < 100 ? "ai primi 100 host" : ""} per{" "}
                <span className="font-bold">{(hostCount || 0) < 100 ? "299€" : "799€"}</span> compreso dominio e hosting grazie a Facevoice.ai.
              </p>
            </div>
            {websiteOfferRequested ? (
              <p className="text-sm text-muted-foreground">Hai già richiesto l&apos;offerta. Verrai contattato a breve.</p>
            ) : (
              <Button onClick={handleWebsiteOfferRequest} disabled={requestingWebsiteOffer}>
                {requestingWebsiteOffer ? "Invio..." : "Richiedi Offerta"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Community Link */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Community Host</CardTitle>
            <CardDescription>
              Connettiti con altri host nella tua zona
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/communities">
                <MessageSquare className="w-4 h-4 mr-2" />
                Vai alle Community
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Collaborazioni Attive Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Collaborazioni Attive</CardTitle>
            <CardDescription>
              Visualizza le collaborazioni KOL&BED attive con i creator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCollaborations ? (
              <div className="text-center py-4">Caricamento...</div>
            ) : collaborations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Nessuna collaborazione attiva al momento
                </p>
                <p className="text-sm text-muted-foreground">
                  Le collaborazioni accettate o completate appariranno qui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {collaborations.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {collab.property?.name || collab.property?.title || "Struttura"}
                        </p>
                        {collab.property?.city && collab.property?.country && (
                          <p className="text-sm text-muted-foreground">
                            {collab.property.city}, {collab.property.country}
                          </p>
                        )}
                        {collab.creator && (
                          <p className="text-sm text-muted-foreground">
                            Creator: {collab.creator.full_name || collab.creator.username || "N/A"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Tipo: {collab.collaboration_type?.replace("_", " ") || "N/A"}
                        </p>
                        {collab.start_date && collab.end_date && (
                          <p className="text-xs text-muted-foreground">
                            Periodo: {new Date(collab.start_date).toLocaleDateString("it-IT")} - {new Date(collab.end_date).toLocaleDateString("it-IT")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {collab.status === "accepted" && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {collab.status === "completed" && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                        <span className="text-sm font-medium">
                          {collab.status === "accepted" && "Accettata"}
                          {collab.status === "completed" && "Completata"}
                        </span>
                      </div>
                    </div>
                    {collab.property?.images && collab.property.images.length > 0 && (
                      <div className="mt-2">
                        <img
                          src={collab.property.images[0]}
                          alt={collab.property.name || collab.property.title}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KOL&BED Preferences Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Preferenze KOL&BED</CardTitle>
                <CardDescription>
                  Configura le tue preferenze per le collaborazioni con i creator
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPreferencesForm(!showPreferencesForm)}
              >
                <Settings className="w-4 h-4 mr-2" />
                {showPreferencesForm ? "Nascondi" : "Modifica"}
              </Button>
            </div>
          </CardHeader>
          {showPreferencesForm && (
            <CardContent className="space-y-6">
              {/* Free Stay Nights */}
              <div>
                <Label htmlFor="free_stay_nights">
                  Notti FREE STAY disponibili
                </Label>
                <Input
                  id="free_stay_nights"
                  type="number"
                  min="0"
                  value={freeStayNightsInput}
                  onChange={(e) => {
                    const value = e.target.value
                    setFreeStayNightsInput(value)
                    // Aggiorna anche lo stato preferences per il salvataggio
                    const numValue = value.trim() === "" ? null : parseInt(value)
                    setPreferences((prev) => ({
                      ...prev,
                      free_stay_nights: numValue ?? 0,
                    }))
                  }}
                  className="mt-1"
                  placeholder="Inserisci numero di notti"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numero di notti che sei disposto ad offrire gratuitamente ai creator
                </p>
              </div>

              {/* Promotion Types */}
              <div>
                <Label>Tipo di promozione richiesta</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="promo_video"
                      checked={preferences.promotion_types.includes("video")}
                      onCheckedChange={() => togglePromotionType("video")}
                    />
                    <label
                      htmlFor="promo_video"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Video
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="promo_photo"
                      checked={preferences.promotion_types.includes("photo")}
                      onCheckedChange={() => togglePromotionType("photo")}
                    />
                    <label
                      htmlFor="promo_photo"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Foto
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="promo_both"
                      checked={preferences.promotion_types.includes("both")}
                      onCheckedChange={() => togglePromotionType("both")}
                    />
                    <label
                      htmlFor="promo_both"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Entrambi
                    </label>
                  </div>
                </div>
              </div>

              {/* Required Social Platforms */}
              <div>
                <Label>Social richiesti per la pubblicazione</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="social_instagram"
                      checked={preferences.required_social_platforms.includes("instagram")}
                      onCheckedChange={() => toggleSocialPlatform("instagram")}
                    />
                    <label
                      htmlFor="social_instagram"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Instagram
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="social_tiktok"
                      checked={preferences.required_social_platforms.includes("tiktok")}
                      onCheckedChange={() => toggleSocialPlatform("tiktok")}
                    />
                    <label
                      htmlFor="social_tiktok"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      TikTok
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="social_facebook"
                      checked={preferences.required_social_platforms.includes("facebook")}
                      onCheckedChange={() => toggleSocialPlatform("facebook")}
                    />
                    <label
                      htmlFor="social_facebook"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Facebook
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="social_linkedin"
                      checked={preferences.required_social_platforms.includes("linkedin")}
                      onCheckedChange={() => toggleSocialPlatform("linkedin")}
                    />
                    <label
                      htmlFor="social_linkedin"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      LinkedIn
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="social_twitter"
                      checked={preferences.required_social_platforms.includes("twitter")}
                      onCheckedChange={() => toggleSocialPlatform("twitter")}
                    />
                    <label
                      htmlFor="social_twitter"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      X (Twitter)
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Requirements */}
              <div>
                <Label htmlFor="additional_requirements">
                  Altri requisiti per le collaborazioni
                </Label>
                <Textarea
                  id="additional_requirements"
                  value={preferences.additional_requirements || ""}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      additional_requirements: e.target.value,
                    }))
                  }
                  className="mt-1"
                  rows={4}
                  placeholder="Inserisci eventuali requisiti aggiuntivi per valutare le collaborazioni con i creator..."
                />
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingPreferences ? "Salvataggio..." : "Salva preferenze"}
              </Button>
            </CardContent>
          )}
          {!showPreferencesForm && (
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Notti FREE STAY:</span>{" "}
                  {freeStayNightsInput || "Non impostato"}
                </p>
                <p>
                  <span className="font-semibold">Tipo promozione:</span>{" "}
                  {preferences.promotion_types.length > 0
                    ? preferences.promotion_types.join(", ")
                    : "Nessuna"}
                </p>
                <p>
                  <span className="font-semibold">Social richiesti:</span>{" "}
                  {preferences.required_social_platforms.length > 0
                    ? preferences.required_social_platforms.join(", ")
                    : "Nessuno"}
                </p>
                {preferences.additional_requirements && (
                  <p>
                    <span className="font-semibold">Altri requisiti:</span>{" "}
                    {preferences.additional_requirements}
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Delete Property Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Struttura</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare definitivamente questa struttura? 
              Questa azione non può essere annullata e eliminerà anche tutte le prenotazioni, 
              recensioni e dati associati.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setPropertyToDelete(null)
              }}
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProperty}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

