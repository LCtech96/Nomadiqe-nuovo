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
import KolBedCalendarSelector from "@/components/kol-bed-calendar-selector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

type HostOnboardingStep = "profile" | "property" | "kol-bed-program" | "website-offer"

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

  // KOL&BED Program data
  const [kolBedData, setKolBedData] = useState({
    selectedDates: [] as string[],
    influencer_type: "" as "" | "micro" | "macro" | "mega" | "any",
    preferred_niche: "",
    min_followers: "100",
    preferred_platforms: [] as string[],
    website_sponsorship: false,
    website_url: "",
    nights_per_collaboration: "",
    required_videos: "",
    required_posts: "",
    required_stories: "",
    kol_bed_months: [] as number[], // Mesi 1-12
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

  // Load saved profile data on mount (without onboarding_status for now due to PostgREST cache issue)
  useEffect(() => {
    const loadSavedState = async () => {
      if (!userId) {
        setLoadingSavedState(false)
        return
      }

      try {
        // Load only basic profile data (onboarding_status not in PostgREST cache yet)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, bio")
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
    
    if (!userId) {
      toast({
        title: "Errore",
        description: "Sessione non valida. Per favore fai login.",
        variant: "destructive",
      })
      router.push("/auth/signin")
      return
    }

    // Validazione: Nome è obbligatorio
    if (!profileData.fullName || profileData.fullName.trim().length === 0) {
      toast({
        title: "Errore",
        description: "Il nome è obbligatorio. Inserisci il tuo nome completo.",
        variant: "destructive",
      })
      return
    }

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

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName,
          username: profileData.username ? profileData.username.toLowerCase().trim() : null,
          avatar_url: avatarUrl || null,
          bio: profileData.bio.trim() || null,
        })
        .eq("id", userId)

      if (error) throw error

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

    if (!propertyData.address || propertyData.address.trim().length === 0) {
      toast({
        title: "Errore",
        description: "L'indirizzo è obbligatorio.",
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

    if (!propertyData.price_per_night || parseFloat(propertyData.price_per_night) <= 0) {
      toast({
        title: "Errore",
        description: "Il prezzo per notte è obbligatorio e deve essere maggiore di 0.",
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
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .insert({
          owner_id: userId,
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
      await saveOnboardingState("kol-bed-program", ["role", "profile", "property"], {
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

  // Get property ID for calendar
  const [propertyId, setPropertyId] = useState<string | null>(null)

  useEffect(() => {
    const loadPropertyId = async () => {
      // Carica propertyId quando si entra nello step kol-bed-program
      if (step !== "kol-bed-program") {
        setPropertyId(null)
        return
      }
      
      if (!userId) {
        // Se non c'è userId, aspetta che venga caricato
        return
      }
      
      try {
        const { data: property, error } = await supabase
          .from("properties")
          .select("id")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (error && error.code !== "PGRST116") {
          console.error("Error loading property ID:", error)
        } else if (property) {
          setPropertyId(property.id)
        }
      } catch (error) {
        console.error("Error loading property ID:", error)
      }
    }
    
    loadPropertyId()
  }, [userId, step, supabase])

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

      // Salva date disponibili per KOL&BED
      if (kolBedData.selectedDates.length > 0) {
        const availabilityRecords = kolBedData.selectedDates.map((date) => ({
          host_id: userId,
          property_id: property.id,
          date,
          available_for_collab: true,
        }))

        // Usa upsert per evitare duplicati
        for (const record of availabilityRecords) {
          await supabase
            .from("host_availability")
            .upsert(record, { onConflict: "host_id,property_id,date" })
        }
      }

      // Salva preferenze KOL&BED - usa upsert con onConflict per evitare errori duplicate key
      const { error: preferencesError } = await supabase
        .from("host_kol_bed_preferences")
        .upsert({
          host_id: userId,
          influencer_type: kolBedData.influencer_type || null,
          preferred_niche: kolBedData.preferred_niche || null,
          min_followers: kolBedData.min_followers ? parseInt(kolBedData.min_followers) : 100,
          preferred_platforms: kolBedData.preferred_platforms,
          website_sponsorship: kolBedData.website_sponsorship,
          website_url: kolBedData.website_sponsorship ? kolBedData.website_url : null,
          nights_per_collaboration: kolBedData.nights_per_collaboration ? parseInt(kolBedData.nights_per_collaboration) : 0,
          required_videos: kolBedData.required_videos ? parseInt(kolBedData.required_videos) : 0,
          required_posts: kolBedData.required_posts ? parseInt(kolBedData.required_posts) : 0,
          required_stories: kolBedData.required_stories ? parseInt(kolBedData.required_stories) : 0,
          kol_bed_months: kolBedData.kol_bed_months.length > 0 ? kolBedData.kol_bed_months : [],
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
      setShowOfferDisclaimer(false)

      toast({
        title: "Richiesta inviata",
        description: "Verrai contattato nei prossimi giorni. Continua a creare il tuo profilo!",
      })

      router.push("/home")
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

      router.push("/home")
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
        <div>Caricamento stato onboarding...</div>
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
            <CardTitle>Completa il tuo profilo Host</CardTitle>
            <CardDescription>Passo 1 di 4 - Informazioni base</CardDescription>
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">Max 10MB, formato JPG/PNG (ritaglio disponibile)</p>
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Lo username deve essere univoco. Se lasciato vuoto, verrà generato automaticamente.
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
            <CardDescription>Passo 2 di 4 - Informazioni sulla proprietà</CardDescription>
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
                <p className="text-xs text-muted-foreground dark:text-gray-400">Max 10MB per immagine (ritaglio disponibile)</p>
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

  // Step 3: KOL&BED Program
  if (step === "kol-bed-program") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Programma KOL&BED</CardTitle>
            <CardDescription>Passo 3 di 4 - Configura il programma per guadagnare il 100% dalle prenotazioni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Programma KOL&BED</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Per guadagnare il 100% dalle tue prenotazioni e arrivare a non pagare neppure l'1% di commissione sulle prenotazioni, 
                devi aderire al programma KOL&BED. Avrai la possibilità di mettere a disposizione per un certo numero 
                di giorni, nei periodi scelti da te stesso, la tua struttura ricettiva in cambio di visibilità, pubblicità, 
                video e book fotografico da influencer con già una certa popolarità sui social come Instagram, Facebook, 
                TikTok o altre piattaforme a scelta.
              </p>
            </div>
            <form onSubmit={handleKolBedProgramSubmit} className="space-y-6">
              {/* Calendario per selezionare date disponibili */}
              {/* Il calendario viene sempre mostrato se userId esiste, anche se propertyId non è ancora caricato */}
              {userId && (
                <KolBedCalendarSelector
                  hostId={userId}
                  propertyId={propertyId || undefined}
                  selectedDates={kolBedData.selectedDates}
                  onDatesChange={(dates) => setKolBedData({ ...kolBedData, selectedDates: dates })}
                />
              )}

              {/* Tipo di influencer */}
              <div className="space-y-2">
                <Label htmlFor="influencer_type">Tipo di influencer preferito</Label>
                <Select
                  value={kolBedData.influencer_type}
                  onValueChange={(value: any) => setKolBedData({ ...kolBedData, influencer_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo di influencer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro (1K-100K follower)</SelectItem>
                    <SelectItem value="macro">Macro (100K-1M follower)</SelectItem>
                    <SelectItem value="mega">Mega (1M+ follower)</SelectItem>
                    <SelectItem value="any">Qualsiasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              {/* Mesi disponibili */}
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
                      variant={kolBedData.kol_bed_months.includes(month.num) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const months = kolBedData.kol_bed_months.includes(month.num)
                          ? kolBedData.kol_bed_months.filter((m) => m !== month.num)
                          : [...kolBedData.kol_bed_months, month.num]
                        setKolBedData({ ...kolBedData, kol_bed_months: months })
                      }}
                    >
                      {month.name}
                    </Button>
                  ))}
                </div>
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
                  {loading ? "Salvataggio..." : "Continua"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 4: Website Offer
  if (step === "website-offer") {
    const isFirst100 = (hostCount || 0) < 100
    const offerPrice = isFirst100 ? 299 : 799

    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
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
              <div className="flex gap-4">
                <Button
                  onClick={handleWebsiteOfferRequest}
                  className="flex-1"
                  disabled={loading || websiteOfferRequested}
                  size="lg"
                >
                  {websiteOfferRequested ? "Richiesta Inviata" : "Richiedi Offerta"}
                </Button>
                <Button
                  onClick={handleWebsiteOfferSkip}
                  variant="outline"
                  className="flex-1"
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
                Verrai contattato nei prossimi giorni. Continua a creare il tuo profilo!
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowOfferDisclaimer(false)
                }}
              >
                Chiudi
              </Button>
              <Button onClick={() => {
                setShowOfferDisclaimer(false)
                router.push("/home")
              }}>
                Continua
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


