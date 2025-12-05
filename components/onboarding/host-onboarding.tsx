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
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"
import { geocodeAddress } from "@/lib/geocoding"
import { put } from "@vercel/blob"

type HostOnboardingStep = "profile" | "property" | "collaborations"

interface HostOnboardingProps {
  onComplete: () => void
}

export default function HostOnboarding({ onComplete }: HostOnboardingProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<HostOnboardingStep>("profile")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    avatarFile: null as File | null,
    avatarPreview: "",
  })

  // Property data
  const [propertyData, setPropertyData] = useState({
    name: "",
    description: "",
    property_type: "apartment" as "apartment" | "house" | "b&b" | "hotel" | "villa" | "other",
    address: "",
    city: "",
    country: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
    images: [] as File[],
    imagePreviews: [] as string[],
  })
  const [currentAmenity, setCurrentAmenity] = useState("")

  // Collaboration settings
  const [collaborationData, setCollaborationData] = useState({
    min_followers: "",
    preferred_niches: [] as string[],
    offers: [] as Array<{
      collaboration_type: "free_stay" | "discounted_stay" | "paid_collaboration"
      discount_percentage?: string
      payment_amount?: string
      description: string
    }>,
  })
  const [currentNiche, setCurrentNiche] = useState("")

  // Check username availability
  useEffect(() => {
    if (profileData.username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", profileData.username.toLowerCase())
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
  }, [profileData.username, supabase])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Errore",
          description: "L'immagine deve essere inferiore a 5MB",
          variant: "destructive",
        })
        return
      }
      setProfileData({
        ...profileData,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file),
      })
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    if (!usernameAvailable) {
      toast({
        title: "Errore",
        description: "Username non disponibile o troppo corto (minimo 3 caratteri)",
        variant: "destructive",
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
          const blob = await put(fileName, profileData.avatarFile, {
            access: "public",
            contentType: profileData.avatarFile.type,
          })
          avatarUrl = blob.url
        } catch (uploadError) {
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
          username: profileData.username.toLowerCase(),
          avatar_url: avatarUrl || null,
          onboarding_step: 3,
        })
        .eq("id", session.user.id)

      if (error) throw error

      setStep("property")
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

  const addAmenity = () => {
    if (currentAmenity.trim() && !propertyData.amenities.includes(currentAmenity.trim())) {
      setPropertyData({
        ...propertyData,
        amenities: [...propertyData.amenities, currentAmenity.trim()],
      })
      setCurrentAmenity("")
    }
  }

  const removeAmenity = (amenity: string) => {
    setPropertyData({
      ...propertyData,
      amenities: propertyData.amenities.filter((a) => a !== amenity),
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + propertyData.images.length > 10) {
      toast({
        title: "Errore",
        description: "Puoi caricare massimo 10 immagini",
        variant: "destructive",
      })
      return
    }

    const newFiles = files.filter((file) => file.size <= 5 * 1024 * 1024)
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file))

    setPropertyData({
      ...propertyData,
      images: [...propertyData.images, ...newFiles],
      imagePreviews: [...propertyData.imagePreviews, ...newPreviews],
    })
  }

  const removeImage = (index: number) => {
    const newImages = propertyData.images.filter((_, i) => i !== index)
    const newPreviews = propertyData.imagePreviews.filter((_, i) => i !== index)
    setPropertyData({
      ...propertyData,
      images: newImages,
      imagePreviews: newPreviews,
    })
  }

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setLoading(true)
    try {
      // Geocode address
      const fullAddress = `${propertyData.address}, ${propertyData.city}, ${propertyData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)

      if (!geocodeResult) {
        toast({
          title: "Attenzione",
          description: "Impossibile geocodificare l'indirizzo. La proprietà verrà salvata senza coordinate.",
        })
      }

      // Upload images
      const imageUrls: string[] = []
      for (const image of propertyData.images) {
        try {
          const fileExtension = image.name.split(".").pop()
          const fileName = `${session.user.id}/properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
          const blob = await put(fileName, image, {
            access: "public",
            contentType: image.type,
          })
          imageUrls.push(blob.url)
        } catch (uploadError) {
          console.error("Image upload error:", uploadError)
          toast({
            title: "Attenzione",
            description: `Errore nel caricamento dell'immagine ${image.name}. Continuo con le altre.`,
            variant: "destructive",
          })
        }
      }

      // Create property
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          host_id: session.user.id,
          name: propertyData.name,
          description: propertyData.description,
          property_type: propertyData.property_type,
          address: propertyData.address,
          city: propertyData.city,
          country: propertyData.country,
          latitude: geocodeResult?.lat || null,
          longitude: geocodeResult?.lon || null,
          price_per_night: parseFloat(propertyData.price_per_night),
          max_guests: parseInt(propertyData.max_guests),
          bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
          bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
          amenities: propertyData.amenities,
          images: imageUrls,
        })
        .select()
        .single()

      if (propertyError) throw propertyError

      toast({
        title: "Successo",
        description: "Struttura creata con successo!",
      })

      setStep("collaborations")
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

  const addNiche = () => {
    if (currentNiche.trim() && !collaborationData.preferred_niches.includes(currentNiche.trim().toLowerCase())) {
      setCollaborationData({
        ...collaborationData,
        preferred_niches: [...collaborationData.preferred_niches, currentNiche.trim().toLowerCase()],
      })
      setCurrentNiche("")
    }
  }

  const removeNiche = (niche: string) => {
    setCollaborationData({
      ...collaborationData,
      preferred_niches: collaborationData.preferred_niches.filter((n) => n !== niche),
    })
  }

  const addOffer = (type: "free_stay" | "discounted_stay" | "paid_collaboration") => {
    if (collaborationData.offers.some((o) => o.collaboration_type === type)) {
      toast({
        title: "Attenzione",
        description: "Hai già aggiunto questa offerta",
        variant: "destructive",
      })
      return
    }

    setCollaborationData({
      ...collaborationData,
      offers: [
        ...collaborationData.offers,
        {
          collaboration_type: type,
          description: "",
        },
      ],
    })
  }

  const removeOffer = (index: number) => {
    setCollaborationData({
      ...collaborationData,
      offers: collaborationData.offers.filter((_, i) => i !== index),
    })
  }

  const updateOffer = (index: number, field: string, value: string) => {
    const newOffers = [...collaborationData.offers]
    newOffers[index] = { ...newOffers[index], [field]: value }
    setCollaborationData({ ...collaborationData, offers: newOffers })
  }

  const handleCollaborationsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return

    setLoading(true)
    try {
      // Get the property created in previous step
      const { data: property, error: propertyFetchError } = await supabase
        .from("properties")
        .select("id")
        .eq("host_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (propertyFetchError || !property) {
        throw new Error("Proprietà non trovata")
      }

      // Create collaboration offers
      for (const offer of collaborationData.offers) {
        const { error: offerError } = await supabase
          .from("collaboration_offers")
          .insert({
            host_id: session.user.id,
            property_id: property.id,
            collaboration_type: offer.collaboration_type,
            min_followers: collaborationData.min_followers ? parseInt(collaborationData.min_followers) : null,
            discount_percentage: offer.discount_percentage ? parseFloat(offer.discount_percentage) : null,
            payment_amount: offer.payment_amount ? parseFloat(offer.payment_amount) : null,
            preferred_niches: collaborationData.preferred_niches.length > 0 ? collaborationData.preferred_niches : null,
            description: offer.description || null,
            is_active: true,
          })

        if (offerError) throw offerError
      }

      // Mark onboarding as completed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_step: 4,
        })
        .eq("id", session.user.id)

      if (updateError) throw updateError

      // Award points
      await supabase.from("points_history").insert({
        user_id: session.user.id,
        points: 50,
        action_type: "onboarding",
        description: "Onboarding Host completato",
      })

      await supabase
        .from("profiles")
        .update({ points: 225 }) // 100 sign up + 75 onboarding + 50 host setup
        .eq("id", session.user.id)

      toast({
        title: "Successo",
        description: "Onboarding completato!",
      })

      onComplete()
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

  // Step 1: Profile
  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Completa il tuo profilo Host</CardTitle>
            <CardDescription>Passo 1 di 3 - Informazioni base</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avatar">Foto profilo</Label>
                <div className="flex items-center gap-4">
                  {profileData.avatarPreview ? (
                    <img
                      src={profileData.avatarPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Max 5MB, formato JPG/PNG</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  required
                  placeholder="Mario Rossi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  required
                  placeholder="mariorossi"
                  minLength={3}
                  pattern="[a-zA-Z0-9_]+"
                />
                {checkingUsername && (
                  <p className="text-xs text-muted-foreground">Verifica in corso...</p>
                )}
                {usernameAvailable === false && (
                  <p className="text-xs text-destructive">Username non disponibile</p>
                )}
                {usernameAvailable === true && (
                  <p className="text-xs text-green-600">✓ Username disponibile</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimo 3 caratteri, solo lettere, numeri e underscore
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !usernameAvailable}>
                {loading ? "Salvataggio..." : "Continua"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: Property
  if (step === "property") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Crea la tua prima struttura</CardTitle>
            <CardDescription>Passo 2 di 3 - Informazioni sulla proprietà</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePropertySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome della struttura *</Label>
                <Input
                  id="name"
                  value={propertyData.name}
                  onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                  required
                  placeholder="Villa con vista mare"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione *</Label>
                <Textarea
                  id="description"
                  value={propertyData.description}
                  onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })}
                  required
                  placeholder="Descrivi la tua struttura..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Tipo di struttura *</Label>
                  <Select
                    value={propertyData.property_type}
                    onValueChange={(value: any) =>
                      setPropertyData({ ...propertyData, property_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Appartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="b&b">B&amp;B</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_night">Prezzo per notte (€) *</Label>
                  <Input
                    id="price_per_night"
                    type="number"
                    step="0.01"
                    min="0"
                    value={propertyData.price_per_night}
                    onChange={(e) =>
                      setPropertyData({ ...propertyData, price_per_night: e.target.value })
                    }
                    required
                    placeholder="100.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo *</Label>
                <Input
                  id="address"
                  value={propertyData.address}
                  onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                  required
                  placeholder="Via Roma 123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    value={propertyData.city}
                    onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                    required
                    placeholder="Roma"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Paese *</Label>
                  <Input
                    id="country"
                    value={propertyData.country}
                    onChange={(e) => setPropertyData({ ...propertyData, country: e.target.value })}
                    required
                    placeholder="Italia"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_guests">Ospiti massimi *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={propertyData.max_guests}
                    onChange={(e) =>
                      setPropertyData({ ...propertyData, max_guests: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Camere</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={propertyData.bedrooms}
                    onChange={(e) =>
                      setPropertyData({ ...propertyData, bedrooms: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bagni</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={propertyData.bathrooms}
                    onChange={(e) =>
                      setPropertyData({ ...propertyData, bathrooms: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Servizi/Amenities</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentAmenity}
                    onChange={(e) => setCurrentAmenity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addAmenity()
                      }
                    }}
                    placeholder="WiFi, Piscina, Parcheggio..."
                  />
                  <Button type="button" onClick={addAmenity}>
                    Aggiungi
                  </Button>
                </div>
                {propertyData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {propertyData.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Foto della struttura (max 10)</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
                <p className="text-xs text-muted-foreground">Max 5MB per immagine</p>
                {propertyData.imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {propertyData.imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("profile")}
                  className="flex-1"
                >
                  Indietro
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Salvataggio..." : "Continua"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 3: Collaborations
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Configura le collaborazioni</CardTitle>
          <CardDescription>Passo 3 di 3 - Imposta le tue offerte per i Creator</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCollaborationsSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="min_followers">Follower minimi richiesti</Label>
              <Input
                id="min_followers"
                type="number"
                min="0"
                value={collaborationData.min_followers}
                onChange={(e) =>
                  setCollaborationData({ ...collaborationData, min_followers: e.target.value })
                }
                placeholder="1000"
              />
              <p className="text-xs text-muted-foreground">
                Lascia vuoto per non impostare un minimo
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nicchie preferite</Label>
              <div className="flex gap-2">
                <Input
                  value={currentNiche}
                  onChange={(e) => setCurrentNiche(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addNiche()
                    }
                  }}
                  placeholder="travel, lifestyle, food..."
                />
                <Button type="button" onClick={addNiche}>
                  Aggiungi
                </Button>
              </div>
              {collaborationData.preferred_niches.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {collaborationData.preferred_niches.map((niche, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      {niche}
                      <button
                        type="button"
                        onClick={() => removeNiche(niche)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Offerte standard</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOffer("free_stay")}
                  disabled={collaborationData.offers.some((o) => o.collaboration_type === "free_stay")}
                >
                  + Soggiorno Gratuito
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOffer("discounted_stay")}
                  disabled={collaborationData.offers.some((o) => o.collaboration_type === "discounted_stay")}
                >
                  + Soggiorno Scontato
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOffer("paid_collaboration")}
                  disabled={collaborationData.offers.some((o) => o.collaboration_type === "paid_collaboration")}
                >
                  + Collaborazione Retribuita
                </Button>
              </div>

              {collaborationData.offers.map((offer, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold">
                      {offer.collaboration_type === "free_stay" && "Soggiorno Gratuito"}
                      {offer.collaboration_type === "discounted_stay" && "Soggiorno Scontato"}
                      {offer.collaboration_type === "paid_collaboration" && "Collaborazione Retribuita"}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOffer(index)}
                    >
                      Rimuovi
                    </Button>
                  </div>

                  {offer.collaboration_type === "discounted_stay" && (
                    <div className="space-y-2 mb-4">
                      <Label htmlFor={`discount-${index}`}>Sconto (%)</Label>
                      <Input
                        id={`discount-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        value={offer.discount_percentage || ""}
                        onChange={(e) => updateOffer(index, "discount_percentage", e.target.value)}
                        placeholder="20"
                      />
                    </div>
                  )}

                  {offer.collaboration_type === "paid_collaboration" && (
                    <div className="space-y-2 mb-4">
                      <Label htmlFor={`payment-${index}`}>Importo (€)</Label>
                      <Input
                        id={`payment-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={offer.payment_amount || ""}
                        onChange={(e) => updateOffer(index, "payment_amount", e.target.value)}
                        placeholder="500.00"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`description-${index}`}>Descrizione</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={offer.description}
                      onChange={(e) => updateOffer(index, "description", e.target.value)}
                      placeholder="Descrivi i dettagli dell'offerta..."
                      rows={3}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("property")}
                className="flex-1"
              >
                Indietro
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Salvataggio..." : "Completa Onboarding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

