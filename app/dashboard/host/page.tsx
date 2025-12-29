"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Plus, Home, Users, Settings, Save, MessageSquare } from "lucide-react"

interface Property {
  id: string
  name: string
  city: string
  country: string
  price_per_night: number
  is_active: boolean
  booking_count: number
}

interface KOLBedPreferences {
  free_stay_nights: number
  promotion_types: string[]
  required_social_platforms: string[]
  additional_requirements: string | null
}

export default function HostDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const { toast } = useToast()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<KOLBedPreferences>({
    free_stay_nights: 0,
    promotion_types: [],
    required_social_platforms: [],
    additional_requirements: null,
  })
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [showPreferencesForm, setShowPreferencesForm] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      loadProperties()
      loadPreferences()
    }
  }, [session])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get booking counts
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
    } finally {
      setLoading(false)
    }
  }

  const loadPreferences = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("host_kol_bed_preferences")
        .select("*")
        .eq("host_id", session.user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setPreferences({
          free_stay_nights: data.free_stay_nights || 0,
          promotion_types: data.promotion_types || [],
          required_social_platforms: data.required_social_platforms || [],
          additional_requirements: data.additional_requirements || null,
        })
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    }
  }

  const handleSavePreferences = async () => {
    if (!session?.user?.id) return

    setSavingPreferences(true)
    try {
      const { error } = await supabase
        .from("host_kol_bed_preferences")
        .upsert({
          host_id: session.user.id,
          free_stay_nights: preferences.free_stay_nights,
          promotion_types: preferences.promotion_types,
          required_social_platforms: preferences.required_social_platforms,
          additional_requirements: preferences.additional_requirements || null,
          updated_at: new Date().toISOString(),
        })

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen p-8">
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
              <CardTitle>Prenotazioni totali</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {properties.reduce((sum, p) => sum + p.booking_count, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

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
                  value={preferences.free_stay_nights}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      free_stay_nights: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="mt-1"
                  placeholder="0"
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
                  {preferences.free_stay_nights}
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

        <Card>
          <CardHeader>
            <CardTitle>Le tue strutture</CardTitle>
            <CardDescription>Gestisci le tue proprietà</CardDescription>
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
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription>
                        {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-2xl font-bold">€{property.price_per_night}</p>
                        <p className="text-sm text-muted-foreground">per notte</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{property.booking_count} prenotazioni</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/dashboard/host/properties/${property.id}`}>
                            Modifica
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/properties/${property.id}`}>Vedi</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

