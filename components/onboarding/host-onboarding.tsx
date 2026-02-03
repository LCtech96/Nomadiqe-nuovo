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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { AMENITIES_LIST } from "@/lib/constants/amenities"
import PropertyPricingCalendar, { DEFAULT_PRICE } from "@/components/property-pricing-calendar"
import { useI18n } from "@/lib/i18n/context"

type HostOnboardingStep = "profile" | "property" | "kol-bed-program" | "website-offer"

interface HostOnboardingProps {
  /** Optional URL to redirect to on completion. Must be serializable (no functions). */
  redirectOnComplete?: string
}

export default function HostOnboarding({ redirectOnComplete }: HostOnboardingProps) {
  const completionUrl = redirectOnComplete ?? "/home"
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<HostOnboardingStep>("profile")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Ottieni l'ID utente da Supabase se Next-Auth non è disponibile
  useEffect(() => {
    const getUserId = async () => {
      if (session?.user?.id) {
        setUserId(session.user.id)
      } else {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser()
        if (supabaseUser?.id) {
          setUserId(supabaseUser.id)
        }
      }
    }
    getUserId()
  }, [session, supabase])

  // Profile data
  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    bio: "",
    avatarFile: null as File | null,
    avatarPreview: "",
    residenceAddress: "",
    residenceCity: "",
    residenceCountry: "",
  })

  // Property data
  const [propertyData, setPropertyData] = useState({
    name: "",
    description: "",
    property_type: "apartment" as "apartment" | "house" | "b&b" | "hotel" | "villa" | "other",
    city: "",
    country: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
    images: [] as File[],
    imagePreviews: [] as string[],
  })
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([])
  const [calendarDatePrices, setCalendarDatePrices] = useState<Record<string, number>>({})
  const [cinFile, setCinFile] = useState<File | null>(null)
  const [cirFile, setCirFile] = useState<File | null>(null)
  const [cinCirSkipped, setCinCirSkipped] = useState(false)

  const [kolBedData, setKolBedData] = useState({
    preferred_niche: "",
    min_followers: "100",
    preferred_platforms: [] as string[],
    website_sponsorship: false,
    website_url: "",
    nights_per_collaboration: "",
    required_videos: "",
    required_posts: "",
    required_stories: "",
  })

  // Website offer data
  const [websiteOfferRequested, setWebsiteOfferRequested] = useState(false)
  const [showOfferDisclaimer, setShowOfferDisclaimer] = useState(false)
  const [hostCount, setHostCount] = useState<number | null>(null)
  const [loadingSavedState, setLoadingSavedState] = useState(true)
  
  // Image cropper states
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageFileToCrop, setImageFileToCrop] = useState<File | null>(null)
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])

  useEffect(() => {
    if (!showOfferDisclaimer) return
    const timeout = setTimeout(() => {
      setShowOfferDisclaimer(false)
      updateSession?.()
        .then(() => router.push(completionUrl))
        .catch(() => router.push(completionUrl))
    }, 2000)

    return () => clearTimeout(timeout)
  }, [showOfferDisclaimer, router, updateSession, completionUrl])

  // Load saved profile data on mount (without onboarding_status for now due to PostgREST cache issue)
  useEffect(() => {
    const loadSavedState = async () => {
      if (!userId) {
        setLoadingSavedState(false)
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, bio, residence_address, residence_city, residence_country")
          .eq("id", userId)
          .maybeSingle()

        // Load host count for website offer
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "host")
        
        setHostCount(count || 0)

        if (error) {
          console.error("Error loading profile:", error)
          setLoadingSavedState(false)
          return
        }

        // Restore profile data if exists
        if (profile) {
          if (profile.full_name || profile.username || profile.avatar_url || profile.bio) {
            setProfileData({
              fullName: profile.full_name || "",
              username: profile.username || "",
              bio: profile.bio || "",
              avatarFile: null,
              avatarPreview: profile.avatar_url || "",
              residenceAddress: (profile as any).residence_address || "",
              residenceCity: (profile as any).residence_city || "",
              residenceCountry: (profile as any).residence_country || "",
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
  }, [userId, supabase])

  // Check username availability (only if username is provided)
  useEffect(() => {
    if (!profileData.username || profileData.username.trim().length === 0) {
      setUsernameAvailable(null)
      return
    }

    const checkUsername = async () => {
      setCheckingUsername(true)
      try {
        // Ottieni l'ID utente da Supabase se Next-Auth non è disponibile
        const { data: { user: supabaseUser } } = await supabase.auth.getUser()
        const userId = session?.user?.id || supabaseUser?.id
        
        // Check if username is already taken by another user
        let query = supabase
          .from("profiles")
          .select("username")
          .eq("username", profileData.username.toLowerCase().trim())
        
        // Solo se abbiamo un ID utente valido, escludiamo il profilo corrente
        if (userId) {
          query = query.neq("id", userId)
        }
        
        const { data, error } = await query.maybeSingle()

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
          title: t("general.error"),
          description: t("onboarding.errorAvatarSize"),
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
    
    if (!userId) {
      toast({
        title: t("general.error"),
        description: t("onboarding.errorInvalidSession"),
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    if (!profileData.fullName || profileData.fullName.trim().length === 0) {
      toast({
        title: t("general.error"),
        description: t("onboarding.errorNameRequired"),
        variant: "destructive",
      })
      return
    }
    if (!profileData.residenceAddress?.trim() || !profileData.residenceCity?.trim() || !profileData.residenceCountry?.trim()) {
      toast({
        title: t("general.error"),
        description: t("onboarding.errorResidenceRequired"),
        variant: "destructive",
      })
      return
    }

    // Check username only if provided
    if (profileData.username && profileData.username.trim().length > 0) {
      if (usernameAvailable === false) {
        toast({
          title: t("general.error"),
          description: t("onboarding.errorUsernameTaken"),
          variant: "destructive",
        })
        return
      }
      if (usernameAvailable === null && checkingUsername) {
        toast({
          title: t("onboarding.errorWait"),
          description: t("onboarding.errorUsernameChecking"),
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
          const fileName = `${userId}/avatar.${fileExtension || "jpg"}`
          
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

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName,
          username: profileData.username ? profileData.username.toLowerCase().trim() : null,
          avatar_url: avatarUrl || null,
          bio: profileData.bio.trim() || null,
          residence_address: profileData.residenceAddress.trim() || null,
          residence_city: profileData.residenceCity.trim() || null,
          residence_country: profileData.residenceCountry.trim() || null,
        })
        .eq("id", userId)

      if (error) throw error

      if (profileData.bio?.trim()) {
        await fetch("/api/profile/check-bio-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: profileData.bio.trim() }),
        })
      }

      // Save onboarding state
      await saveOnboardingState("property", ["role", "profile"], {
        full_name: profileData.fullName,
        username: profileData.username,
        avatar_url: avatarUrl || null,
        bio: profileData.bio,
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

  const toggleAmenity = (amenity: string) => {
    if (propertyData.amenities.includes(amenity)) {
      setPropertyData({
        ...propertyData,
        amenities: propertyData.amenities.filter((a) => a !== amenity),
      })
    } else {
      setPropertyData({
        ...propertyData,
        amenities: [...propertyData.amenities, amenity],
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + propertyData.images.length > 10) {
      toast({
        title: t("general.error"),
        description: t("onboarding.errorImageMax"),
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
    if (!userId) {
      toast({
        title: "Errore",
        description: "Sessione non valida. Per favore fai login.",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    // Validazione campi obbligatori
    if (!propertyData.name || propertyData.name.trim().length === 0) {
      toast({
        title: "Errore",
        description: "Il nome della struttura è obbligatorio.",
        variant: "destructive",
      })
      return
    }

    if (!propertyData.description || propertyData.description.trim().length === 0) {
      toast({
        title: "Errore",
        description: "La descrizione della struttura è obbligatoria.",
        variant: "destructive",
      })
      return
    }

    if (!propertyData.city || propertyData.city.trim().length === 0) {
      toast({
        title: "Errore",
        description: "La città è obbligatoria.",
        variant: "destructive",
      })
      return
    }

    if (!propertyData.country || propertyData.country.trim().length === 0) {
      toast({
        title: "Errore",
        description: "Il paese è obbligatorio.",
        variant: "destructive",
      })
      return
    }

    if (!propertyData.max_guests || parseInt(propertyData.max_guests) <= 0) {
      toast({
        title: "Errore",
        description: "Il numero massimo di ospiti è obbligatorio e deve essere maggiore di 0.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const fullAddress = `${propertyData.city}, ${propertyData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)
      if (!geocodeResult) {
        toast({
          title: "Attenzione",
          description: "Impossibile geocodificare. La proprietà verrà salvata senza coordinate.",
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
          const fileName = `${userId}/properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension || "jpg"}`
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
      if (!cinCirSkipped) {
        let cinUrl = ""
        let cirUrl = ""
        if (cinFile && blobToken) {
          try {
            const b = await put(`${userId}/cin.${cinFile.name.split(".").pop() || "pdf"}`, cinFile, { access: "public", contentType: cinFile.type, token: blobToken })
            cinUrl = b.url
          } catch (e) {
            console.warn("CIN upload failed:", e)
          }
        }
        if (cirFile && blobToken) {
          try {
            const b = await put(`${userId}/cir.${cirFile.name.split(".").pop() || "pdf"}`, cirFile, { access: "public", contentType: cirFile.type, token: blobToken })
            cirUrl = b.url
          } catch (e) {
            console.warn("CIR upload failed:", e)
          }
        }
        if ((cinUrl || cirUrl) && userId) {
          await supabase.from("profiles").update({
            cin_url: cinUrl || undefined,
            cir_url: cirUrl || undefined,
          }).eq("id", userId)
        }
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          owner_id: userId,
          name: propertyData.name,
          description: propertyData.description,
          property_type: propertyData.property_type,
          address: propertyData.city + ", " + propertyData.country,
          city: propertyData.city,
          country: propertyData.country,
          latitude: geocodeResult?.lat || null,
          longitude: geocodeResult?.lon || null,
          price_per_night: DEFAULT_PRICE,
          max_guests: parseInt(propertyData.max_guests),
          bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
          bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
          amenities: propertyData.amenities,
          images: imageUrls,
        })
        .select()
        .single()

      if (propertyError) throw propertyError

      if (property && calendarSelectedDates.length > 0) {
        for (const dateStr of calendarSelectedDates) {
          const price = calendarDatePrices[dateStr] ?? DEFAULT_PRICE
          await supabase.from("property_daily_pricing").upsert({
            property_id: property.id,
            date: dateStr,
            status: "available",
            price_cents: Math.round(price * 100),
            updated_at: new Date().toISOString(),
          }, { onConflict: "property_id,date" })
        }
      }

      await saveOnboardingState("kol-bed-program", ["role", "profile", "property"], {
        name: propertyData.name,
        description: propertyData.description,
        property_type: propertyData.property_type,
        city: propertyData.city,
        country: propertyData.country,
        price_per_night: DEFAULT_PRICE,
        max_guests: propertyData.max_guests,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        amenities: propertyData.amenities,
        images: imageUrls,
      })

      toast({
        title: t("general.success"),
        description: t("onboarding.propertyCreated"),
      })

      setStep("kol-bed-program")
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

  const handleKolBedProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({
        title: "Errore",
        description: "Sessione non valida. Per favore fai login.",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    // Validazione follower minimi
    if (kolBedData.min_followers && parseInt(kolBedData.min_followers) < 100) {
      toast({
        title: "Errore",
        description: "Il numero minimo di follower deve essere almeno 100",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Verifica che almeno una struttura sia stata creata
      const { data: properties, error: propertiesCheckError } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", userId)
        .limit(1)

      if (propertiesCheckError) {
        throw new Error("Errore nel controllo delle strutture")
      }

      if (!properties || properties.length === 0) {
        toast({
          title: "Errore",
          description: "Devi creare almeno una struttura prima di procedere. Torna allo step precedente.",
          variant: "destructive",
        })
        setLoading(false)
        setStep("property")
        return
      }

      // Get the property created in previous step
      const { data: property, error: propertyFetchError } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (propertyFetchError || !property) {
        throw new Error("Proprietà non trovata. Assicurati di aver creato almeno una struttura.")
      }

      const { error: preferencesError } = await supabase
        .from("host_kol_bed_preferences")
        .upsert({
          host_id: userId,
          influencer_type: null,
          preferred_niche: kolBedData.preferred_niche || null,
          min_followers: kolBedData.min_followers ? parseInt(kolBedData.min_followers) : 100,
          preferred_platforms: kolBedData.preferred_platforms,
          website_sponsorship: kolBedData.website_sponsorship,
          website_url: kolBedData.website_sponsorship ? kolBedData.website_url : null,
          nights_per_collaboration: kolBedData.nights_per_collaboration ? parseInt(kolBedData.nights_per_collaboration) : 0,
          required_videos: kolBedData.required_videos ? parseInt(kolBedData.required_videos) : 0,
          required_posts: kolBedData.required_posts ? parseInt(kolBedData.required_posts) : 0,
          required_stories: kolBedData.required_stories ? parseInt(kolBedData.required_stories) : 0,
          kol_bed_months: [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "host_id"
        })

      if (preferencesError) {
        console.warn("Could not save KOL&BED preferences:", preferencesError)
        // Non bloccare l'onboarding se questo fallisce
      }

      toast({
        title: "Successo",
        description: "Preferenze KOL&BED salvate!",
      })

      setStep("website-offer")
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

  const handleWebsiteOfferRequest = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Sessione non valida. Per favore fai login.",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    setLoading(true)
    try {
      const isFirst100 = (hostCount || 0) < 100
      const offerPrice = isFirst100 ? 299 : 799

      // Salva la richiesta nel database
      const { error } = await supabase
        .from("website_offer_requests")
        .insert({
          host_id: userId,
          status: "pending",
          offer_price: offerPrice,
          is_first_100: isFirst100,
        })

      if (error) throw error

      // Mark onboarding as completed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
        })
        .eq("id", userId)

      if (updateError) {
        console.warn("Could not update onboarding_completed:", updateError)
      }

      // Registra referral se presente
      try {
        const pendingCode = localStorage.getItem('pending_referral_code')
        if (pendingCode && userId) {
          await supabase.rpc('register_host_referral_with_points', {
            referral_code_param: pendingCode.trim().toUpperCase(),
            referred_host_id_param: userId
          })
          localStorage.removeItem('pending_referral_code')
        }
      } catch (referralError) {
        console.warn("Could not register referral:", referralError)
        // Non bloccare il flusso se il referral non viene registrato
      }

      // Ottieni i dettagli del profilo per l'email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .maybeSingle()

      // Invia notifica email a luca@facevoice.ai
      try {
        await fetch("/api/website-offer/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hostId: userId,
            hostEmail: profile?.email || session?.user?.email || "",
            hostName: profile?.full_name || session?.user?.name || "",
            offerPrice,
            isFirst100,
          }),
        })
      } catch (emailError) {
        console.error("Error sending notification email:", emailError)
        // Non bloccare il flusso se l'email non viene inviata
      }

      setWebsiteOfferRequested(true)
      setShowOfferDisclaimer(true)

      toast({
        title: t("onboarding.requestSent"),
        description: t("onboarding.requestSentDesc"),
      })

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

  const handleWebsiteOfferSkip = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Sessione non valida. Per favore fai login.",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    setLoading(true)
    try {
      // Mark onboarding as completed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
        })
        .eq("id", userId)

      if (updateError) {
        console.warn("Could not update onboarding_completed:", updateError)
      }

      // Registra referral se presente
      try {
        const pendingCode = localStorage.getItem('pending_referral_code')
        if (pendingCode && userId) {
          await supabase.rpc('register_host_referral_with_points', {
            referral_code_param: pendingCode.trim().toUpperCase(),
            referred_host_id_param: userId
          })
          localStorage.removeItem('pending_referral_code')
        }
      } catch (referralError) {
        console.warn("Could not register referral:", referralError)
        // Non bloccare il flusso se il referral non viene registrato
      }

      // Award onboarding points
      try {
        const { awardPoints } = await import("@/lib/points")
        if (userId) {
          await awardPoints(userId, "onboarding", "Onboarding Host completato")
        }
      } catch (pointsError) {
        console.warn("Could not award onboarding points:", pointsError)
      }

      toast({
        title: "Successo",
        description: "Onboarding completato!",
      })

      router.push(completionUrl)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <div>{t("onboarding.loadingState")}</div>
      </div>
    )
  }

  // Step 1: Profile
  if (step === "profile") {
    return (
      <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("onboarding.profileHostTitle")}</CardTitle>
            <CardDescription>{t("onboarding.profileHostStep")}</CardDescription>
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
                    <div className="w-20 h-20 rounded-full bg-muted dark:bg-gray-900 flex items-center justify-center">
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">{t("onboarding.avatarMaxHint")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t("onboarding.fullName")}</Label>
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
                  <p className="text-xs text-muted-foreground">{t("onboarding.usernameCheck")}</p>
                )}
                {usernameAvailable === false && profileData.username && (
                  <p className="text-xs text-destructive">{t("onboarding.usernameTaken")}</p>
                )}
                {usernameAvailable === true && profileData.username && (
                  <p className="text-xs text-green-600">{t("onboarding.usernameAvailable")}</p>
                )}
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  {t("onboarding.usernameHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (opzionale)</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Racconta qualcosa di te..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Una breve descrizione di te e della tua struttura
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="residence_address">Indirizzo di residenza *</Label>
                <Input
                  id="residence_address"
                  value={profileData.residenceAddress}
                  onChange={(e) => setProfileData({ ...profileData, residenceAddress: e.target.value })}
                  required
                  placeholder="Via Roma 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="residence_city">{t("onboarding.residenceCity")}</Label>
                  <Input
                    id="residence_city"
                    value={profileData.residenceCity}
                    onChange={(e) => setProfileData({ ...profileData, residenceCity: e.target.value })}
                    required
                    placeholder="Roma"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residence_country">Paese di residenza *</Label>
                  <Input
                    id="residence_country"
                    value={profileData.residenceCountry}
                    onChange={(e) => setProfileData({ ...profileData, residenceCountry: e.target.value })}
                    required
                    placeholder="Italia"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || (profileData.username && usernameAvailable === false) || checkingUsername}
              >
                {loading ? t("onboarding.saving") : t("general.continue")}
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
            <CardTitle>{t("onboarding.createProperty")}</CardTitle>
            <CardDescription>{t("onboarding.propertyStep")}</CardDescription>
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
                <Label>Prezzo e disponibilità (calendario)</Label>
                <PropertyPricingCalendar
                  selectedDates={calendarSelectedDates}
                  onDatesChange={setCalendarSelectedDates}
                  datePrices={calendarDatePrices}
                  onDatePriceChange={(date, price) =>
                    setCalendarDatePrices((prev: Record<string, number>) => ({ ...prev, [date]: price }))
                  }
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
                <p className="text-xs text-muted-foreground">Seleziona i servizi disponibili nella struttura</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {AMENITIES_LIST.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={propertyData.amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <Label htmlFor={`amenity-${amenity}`} className="font-normal text-sm cursor-pointer">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Documenti CIN e CIR (opzionale, puoi caricarli anche dopo)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cin" className="text-sm">Codice Identificativo Nazionale (CIN)</Label>
                    <Input
                      id="cin"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setCinFile(e.target.files?.[0] || null)}
                    />
                    {cinFile && <p className="text-xs text-muted-foreground">{cinFile.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cir" className="text-sm">Codice Identificativo Regionale (CIR)</Label>
                    <Input
                      id="cir"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setCirFile(e.target.files?.[0] || null)}
                    />
                    {cirFile && <p className="text-xs text-muted-foreground">{cirFile.name}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cin_cir_skip"
                    checked={cinCirSkipped}
                    onCheckedChange={(c) => setCinCirSkipped(!!c)}
                  />
                  <Label htmlFor="cin_cir_skip" className="font-normal text-sm">Salta per ora, caricherò dopo</Label>
                </div>
                {cinCirSkipped && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    Sarà obbligatorio dimostrare di essere in possesso di tali documenti per poter utilizzare la propria struttura per l&apos;affitto a breve termine.
                  </p>
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">Puoi selezionare e caricare fino a 10 foto in un&apos;unica operazione. Max 10MB per immagine (ritaglio disponibile).</p>
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
                  {t("general.back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? t("onboarding.saving") : t("general.continue")}
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

  // Step 3: KOL&BED Program
  if (step === "kol-bed-program") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>{t("onboarding.kolBedProgram")}</CardTitle>
            <CardDescription>{t("onboarding.kolBedStep")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Programma KOL&BED</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                In qualità di Host, devi aderire al programma KOL&BED e mettere a disposizione la tua struttura ad influencer per almeno 7 notti l&apos;anno. 
                Potrai modificare le date dalla dashboard tramite il calendario. Dal calendario potrai: aprire le date (disponibile per viaggiatori), 
                chiuderle con un click (rosso = non disponibile), selezionarle per KOL&BED con doppio click (verde = disponibile per influencer).
              </p>
            </div>
            <form onSubmit={handleKolBedProgramSubmit} className="space-y-6">
              {/* Nicchia preferita */}
              <div className="space-y-2">
                <Label htmlFor="preferred_niche">Nicchia di riferimento</Label>
                <Input
                  id="preferred_niche"
                  value={kolBedData.preferred_niche}
                  onChange={(e) => setKolBedData({ ...kolBedData, preferred_niche: e.target.value })}
                  placeholder="travel, lifestyle, food, adventure..."
                />
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  La nicchia di riferimento per le collaborazioni
                </p>
              </div>

              {/* Follower minimi */}
              <div className="space-y-2">
                <Label htmlFor="min_followers">Numero minimo di follower (minimo 100) *</Label>
                <Input
                  id="min_followers"
                  type="number"
                  min="100"
                  value={kolBedData.min_followers}
                  onChange={(e) => setKolBedData({ ...kolBedData, min_followers: e.target.value })}
                  placeholder="100"
                  required
                />
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Il numero minimo di follower che vuoi che l'influencer abbia (minimo 100)
                </p>
              </div>

              {/* Piattaforme preferite */}
              <div className="space-y-2">
                <Label>Piattaforme in cui prediligi essere pubblicizzato</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["instagram", "facebook", "tiktok", "youtube", "linkedin", "twitter"].map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={`platform-${platform}`}
                        checked={kolBedData.preferred_platforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setKolBedData({
                              ...kolBedData,
                              preferred_platforms: [...kolBedData.preferred_platforms, platform],
                            })
                          } else {
                            setKolBedData({
                              ...kolBedData,
                              preferred_platforms: kolBedData.preferred_platforms.filter((p) => p !== platform),
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`platform-${platform}`} className="font-normal capitalize">
                        {platform}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sponsorizzazione sito web */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="website_sponsorship"
                    checked={kolBedData.website_sponsorship}
                    onCheckedChange={(checked) =>
                      setKolBedData({ ...kolBedData, website_sponsorship: checked as boolean })
                    }
                  />
                  <Label htmlFor="website_sponsorship">Vuoi avere sponsorizzato un sito web personale o una pagina/profilo?</Label>
                </div>
                {kolBedData.website_sponsorship && (
                  <Input
                    id="website_url"
                    value={kolBedData.website_url}
                    onChange={(e) => setKolBedData({ ...kolBedData, website_url: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                )}
              </div>

              {/* Notti per collaborazione */}
              <div className="space-y-2">
                <Label htmlFor="nights_per_collaboration">Notti per collaborazione FREE STAY</Label>
                <Input
                  id="nights_per_collaboration"
                  type="number"
                  min="0"
                  value={kolBedData.nights_per_collaboration}
                  onChange={(e) =>
                    setKolBedData({ ...kolBedData, nights_per_collaboration: e.target.value })
                  }
                  placeholder="2"
                />
              </div>

              {/* Video/Post/Storie richiesti */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="required_videos">Video richiesti</Label>
                  <Input
                    id="required_videos"
                    type="number"
                    min="0"
                    value={kolBedData.required_videos}
                    onChange={(e) =>
                      setKolBedData({ ...kolBedData, required_videos: e.target.value })
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
                    value={kolBedData.required_posts}
                    onChange={(e) =>
                      setKolBedData({ ...kolBedData, required_posts: e.target.value })
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
                    value={kolBedData.required_stories}
                    onChange={(e) =>
                      setKolBedData({ ...kolBedData, required_stories: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("property")}
                  className="flex-1"
                >
                  {t("general.back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? t("onboarding.saving") : t("general.continue")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "website-offer") {
    const isFirst100 = (hostCount || 0) < 100
    const offerPrice = isFirst100 ? 299 : 799
    const position = hostCount ?? 0
    const maxPos = 100

    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#111827] dark:to-[#111827] relative">
          <p className="absolute bottom-4 right-4 text-xs text-muted-foreground">
            {position}/{maxPos}
          </p>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Offerta Speciale Sito Web</CardTitle>
              <CardDescription>Passo 4 di 4 - Crea il tuo sito web personalizzato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hero centrale */}
              <div className="text-center space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  Annulla TOTALMENTE la dipendenza dalle piattaforme OTA
                </h2>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Per riuscire a non usare più completamente le piattaforme OTA e riuscire a preservare tutte le entrate 
                  e non pagare quindi commissioni, Nomadiqe ti aiuta offrendo la possibilità di realizzare un sito web 
                  su misura {isFirst100 ? "ai primi 100 host iscritti" : ""} per soli{" "}
                  <span className="font-bold text-lg">{offerPrice}€</span> compreso dominio e hosting grazie alla 
                  collaborazione con Facevoice.ai, grazie alla quale si potrà pian piano riuscire ad annullare TOTALMENTE 
                  la dipendenza dalle piattaforme OTA e sulla quale canalizzare l'intero traffico.
                </p>
                {!isFirst100 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                    ⚠️ Dal 101esimo host in poi l'offerta sarà di 799€ + dominio + hosting
                  </p>
                )}
                {isFirst100 && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    ✓ Offerta valida solo per i primi 100 iscritti come host
                  </p>
                )}
              </div>

              {/* Pulsanti */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleWebsiteOfferRequest}
                  className="flex-1 whitespace-normal text-center text-sm md:text-base py-3"
                  disabled={loading || websiteOfferRequested}
                  size="lg"
                >
                  {websiteOfferRequested ? "Richiesta Inviata" : "Richiedi Offerta"}
                </Button>
                <Button
                  onClick={handleWebsiteOfferSkip}
                  variant="outline"
                  className="flex-1 whitespace-normal text-center text-sm md:text-base py-3"
                  disabled={loading}
                  size="lg"
                >
                  Richiedimelo successivamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Disclaimer */}
        <Dialog open={showOfferDisclaimer} onOpenChange={setShowOfferDisclaimer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Richiesta Inviata</DialogTitle>
              <DialogDescription>
                Verrai contattato nei prossimi giorni. Ti reindirizziamo alla Home.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button onClick={async () => {
                setShowOfferDisclaimer(false)
                await updateSession?.()
                router.push(completionUrl)
              }}>
                Vai alla Home
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Fallback (should not reach here)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Errore: step non riconosciuto</div>
    </div>
  )
}


