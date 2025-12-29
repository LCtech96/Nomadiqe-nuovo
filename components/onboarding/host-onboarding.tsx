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
import ImageCropper from "@/components/image-cropper"

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
    // Nuovi campi per KOL&BED
    nights_per_collaboration: "",
    required_videos: "",
    required_posts: "",
    required_stories: "",
    kol_bed_months: [] as number[], // Mesi 1-12
  })
  const [currentNiche, setCurrentNiche] = useState("")
  const [loadingSavedState, setLoadingSavedState] = useState(true)
  
  // Image cropper states
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageFileToCrop, setImageFileToCrop] = useState<File | null>(null)
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])

  // Load saved profile data on mount (without onboarding_status for now due to PostgREST cache issue)
  useEffect(() => {
    const loadSavedState = async () => {
      if (!session?.user?.id) {
        setLoadingSavedState(false)
        return
      }

      try {
        // Load only basic profile data (onboarding_status not in PostgREST cache yet)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle()

        if (error) {
          console.error("Error loading profile:", error)
          setLoadingSavedState(false)
          return
        }

        // Restore profile data if exists
        if (profile) {
          if (profile.full_name || profile.username || profile.avatar_url) {
            setProfileData({
              fullName: profile.full_name || "",
              username: profile.username || "",
              avatarFile: null,
              avatarPreview: profile.avatar_url || "",
            })
          }
        }
      } catch (error) {
        console.error("Error loading saved onboarding state:", error)
      } finally {
        setLoadingSavedState(false)
      }
    }

    loadSavedState()
  }, [session?.user?.id, supabase])

  // Check username availability (only if username is provided)
  useEffect(() => {
    if (!profileData.username || profileData.username.trim().length === 0) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        // Check if username is already taken by another user
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", profileData.username.toLowerCase().trim())
          .neq("id", session?.user?.id || "") // Exclude current user if editing
          .maybeSingle()

        if (error && error.code !== "PGRST116") throw error

        setUsernameAvailable(!data) // Available if no data found
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [profileData.username, supabase, session?.user?.id])

  // Helper function to save onboarding state (disabled temporarily due to PostgREST cache issue)
  const saveOnboardingState = async (currentStep: string, completedSteps: string[], stepData?: any) => {
    // Temporarily disabled - PostgREST cache hasn't updated with onboarding_status column yet
    // Will be re-enabled after cache refresh
    return
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Allow larger files (up to 10MB) since we'll crop and compress
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Errore",
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

    // Check username only if provided
    if (profileData.username && profileData.username.trim().length > 0) {
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
    }

    setLoading(true)
    try {
      let avatarUrl = ""

      // Upload avatar if provided
      if (profileData.avatarFile) {
        try {
          const fileExtension = profileData.avatarFile.name.split(".").pop()
          const fileName = `${session.user.id}/avatar.${fileExtension}`
          
          // Use token from environment variable (must be NEXT_PUBLIC_* to work in browser)
          const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN
          
          const blob = await put(fileName, profileData.avatarFile, {
            access: "public",
            contentType: profileData.avatarFile.type,
            token: blobToken, // Explicitly pass token
          })
          avatarUrl = blob.url
        } catch (uploadError: any) {
          console.error("Avatar upload error:", uploadError)
          const errorMessage = uploadError?.message || "Errore sconosciuto"
          
          if (errorMessage.includes("token") || errorMessage.includes("Token")) {
            toast({
              title: "Errore di configurazione",
              description: "Token Vercel Blob non configurato. Configura NEW_BLOB_READ_WRITE_TOKEN nelle variabili d'ambiente. Il profilo verrà salvato senza foto.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Attenzione",
              description: "Errore nel caricamento dell'avatar. Il profilo verrà salvato senza foto.",
            })
          }
        }
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName,
          username: profileData.username ? profileData.username.toLowerCase().trim() : null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", session.user.id)

      if (error) throw error

      // Save onboarding state
      await saveOnboardingState("property", ["role", "profile"], {
        full_name: profileData.fullName,
        username: profileData.username,
        avatar_url: avatarUrl || null,
      })

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

    // Filter by size (allow up to 10MB before cropping)
    const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024)
    
    if (validFiles.length === 0) {
      toast({
        title: "Errore",
        description: "Le immagini devono essere inferiori a 10MB",
        variant: "destructive",
      })
      return
    }

    // Store pending files and process first one
    setPendingImageFiles(validFiles)
    setImageFileToCrop(validFiles[0])
    setShowImageCropper(true)
    
    // Reset input
    e.target.value = ""
  }

  const handleImageCropComplete = (croppedFile: File) => {
    const newPreview = URL.createObjectURL(croppedFile)
    
    setPropertyData({
      ...propertyData,
      images: [...propertyData.images, croppedFile],
      imagePreviews: [...propertyData.imagePreviews, newPreview],
    })

    // Process next file if available
    if (pendingImageFiles.length > 1) {
      const remainingFiles = pendingImageFiles.slice(1)
      setPendingImageFiles(remainingFiles)
      setImageFileToCrop(remainingFiles[0])
      // Keep cropper open for next image
    } else {
      setShowImageCropper(false)
      setImageFileToCrop(null)
      setPendingImageFiles([])
    }
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
      // Use token from environment variable (must be NEXT_PUBLIC_* to work in browser)
      const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN
      
      if (!blobToken && propertyData.images.length > 0) {
        toast({
          title: "Errore di configurazione",
          description: "Token Vercel Blob non configurato. Configura NEW_BLOB_READ_WRITE_TOKEN nelle variabili d'ambiente.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      for (const image of propertyData.images) {
        try {
          const fileExtension = image.name.split(".").pop()
          const fileName = `${session.user.id}/properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
          const blob = await put(fileName, image, {
            access: "public",
            contentType: image.type,
            token: blobToken, // Explicitly pass token
          })
          imageUrls.push(blob.url)
        } catch (uploadError: any) {
          console.error("Image upload error:", uploadError)
          const errorMessage = uploadError?.message || "Errore sconosciuto"
          
          if (errorMessage.includes("token") || errorMessage.includes("Token")) {
            toast({
              title: "Errore di configurazione",
              description: "Token Vercel Blob non configurato. Configura NEW_BLOB_READ_WRITE_TOKEN nelle variabili d'ambiente.",
              variant: "destructive",
            })
            setLoading(false)
            return
          } else {
            toast({
              title: "Attenzione",
              description: `Errore nel caricamento dell'immagine ${image.name}. Continuo con le altre.`,
              variant: "destructive",
            })
          }
        }
      }

      // Create property
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          owner_id: session.user.id,
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

      // Save onboarding state after creating property
      await saveOnboardingState("collaborations", ["role", "profile", "property"], {
        name: propertyData.name,
        description: propertyData.description,
        property_type: propertyData.property_type,
        address: propertyData.address,
        city: propertyData.city,
        country: propertyData.country,
        price_per_night: propertyData.price_per_night,
        max_guests: propertyData.max_guests,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        amenities: propertyData.amenities,
        images: imageUrls,
      })

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
        .eq("owner_id", session.user.id)
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

      // Salva preferenze KOL&BED
      const { error: preferencesError } = await supabase
        .from("host_kol_bed_preferences")
        .upsert({
          host_id: session.user.id,
          free_stay_nights: collaborationData.nights_per_collaboration ? parseInt(collaborationData.nights_per_collaboration) : 0,
          nights_per_collaboration: collaborationData.nights_per_collaboration ? parseInt(collaborationData.nights_per_collaboration) : 0,
          required_videos: collaborationData.required_videos ? parseInt(collaborationData.required_videos) : 0,
          required_posts: collaborationData.required_posts ? parseInt(collaborationData.required_posts) : 0,
          required_stories: collaborationData.required_stories ? parseInt(collaborationData.required_stories) : 0,
          kol_bed_months: collaborationData.kol_bed_months.length > 0 ? collaborationData.kol_bed_months : [],
          updated_at: new Date().toISOString(),
        })

      if (preferencesError) {
        console.warn("Could not save KOL&BED preferences:", preferencesError)
        // Non bloccare l'onboarding se questo fallisce
      }

      // Mark onboarding as completed (without onboarding_status for now)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
        })
        .eq("id", session.user.id)

      if (updateError) {
        console.warn("Could not update onboarding_completed:", updateError)
        // Don't throw - continue anyway
      }

      // Award onboarding points (sign up and regular onboarding should already be awarded)
      try {
        const { awardPoints } = await import("@/lib/points")
        // This is for host-specific onboarding completion
        // We'll use the onboarding action type
        await awardPoints(session.user.id, "onboarding", "Onboarding Host completato")
      } catch (pointsError) {
        console.warn("Could not award onboarding points:", pointsError)
      }

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

  // Show loading while restoring saved state
  if (loadingSavedState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento stato onboarding...</div>
      </div>
    )
  }

  // Step 1: Profile
  if (step === "profile") {
    return (
      <>
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
                <p className="text-xs text-muted-foreground">Max 10MB, formato JPG/PNG (ritaglio disponibile)</p>
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
                  placeholder="mariorossi"
                />
                {checkingUsername && profileData.username && (
                  <p className="text-xs text-muted-foreground">Verifica in corso...</p>
                )}
                {usernameAvailable === false && profileData.username && (
                  <p className="text-xs text-destructive">✗ Username non disponibile</p>
                )}
                {usernameAvailable === true && profileData.username && (
                  <p className="text-xs text-green-600">✓ Username disponibile</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Lo username deve essere univoco. Se lasciato vuoto, verrà generato automaticamente.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || (profileData.username && usernameAvailable === false) || checkingUsername}
              >
                {loading ? "Salvataggio..." : "Continua"}
              </Button>
            </form>
          </CardContent>
        </Card>
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

  // Step 2: Property
  if (step === "property") {
    return (
      <>
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
                <p className="text-xs text-muted-foreground">Max 10MB per immagine (ritaglio disponibile)</p>
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
        <ImageCropper
          open={showImageCropper}
          onOpenChange={(open) => {
            setShowImageCropper(open)
            if (!open) {
              setImageFileToCrop(null)
              setPendingImageFiles([])
            }
          }}
          imageFile={imageFileToCrop}
          onCropComplete={handleImageCropComplete}
          aspectRatio={4 / 3}
          maxWidth={1200}
          maxHeight={900}
        />
      </>
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

            {/* Nuovi campi KOL&BED */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-4 text-blue-900 dark:text-blue-100">Impostazioni KOL&BED</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nights_per_collaboration">Notti per collaborazione FREE STAY</Label>
                  <Input
                    id="nights_per_collaboration"
                    type="number"
                    min="0"
                    value={collaborationData.nights_per_collaboration}
                    onChange={(e) =>
                      setCollaborationData({ ...collaborationData, nights_per_collaboration: e.target.value })
                    }
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Numero di notti che offri per ogni collaborazione FREE STAY
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="required_videos">Video richiesti</Label>
                    <Input
                      id="required_videos"
                      type="number"
                      min="0"
                      value={collaborationData.required_videos}
                      onChange={(e) =>
                        setCollaborationData({ ...collaborationData, required_videos: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="required_posts">Post richiesti</Label>
                    <Input
                      id="required_posts"
                      type="number"
                      min="0"
                      value={collaborationData.required_posts}
                      onChange={(e) =>
                        setCollaborationData({ ...collaborationData, required_posts: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="required_stories">Storie richieste</Label>
                    <Input
                      id="required_stories"
                      type="number"
                      min="0"
                      value={collaborationData.required_stories}
                      onChange={(e) =>
                        setCollaborationData({ ...collaborationData, required_stories: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mesi in cui aderisci al programma KOL&BED</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { num: 1, name: "Gen" },
                      { num: 2, name: "Feb" },
                      { num: 3, name: "Mar" },
                      { num: 4, name: "Apr" },
                      { num: 5, name: "Mag" },
                      { num: 6, name: "Giu" },
                      { num: 7, name: "Lug" },
                      { num: 8, name: "Ago" },
                      { num: 9, name: "Set" },
                      { num: 10, name: "Ott" },
                      { num: 11, name: "Nov" },
                      { num: 12, name: "Dic" },
                    ].map((month) => (
                      <Button
                        key={month.num}
                        type="button"
                        variant={collaborationData.kol_bed_months.includes(month.num) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const months = collaborationData.kol_bed_months.includes(month.num)
                            ? collaborationData.kol_bed_months.filter((m) => m !== month.num)
                            : [...collaborationData.kol_bed_months, month.num]
                          setCollaborationData({ ...collaborationData, kol_bed_months: months })
                        }}
                      >
                        {month.name}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seleziona i mesi in cui sei disponibile per collaborazioni
                  </p>
                </div>
              </div>
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

