"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { geocodeAddress } from "@/lib/geocoding"
import Link from "next/link"
import { X, VideoIcon, Loader2, MapPin } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import LocationPickerMap from "@/components/location-picker-map"

export default function EditPropertyPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentAmenity, setCurrentAmenity] = useState("")
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [savingLocation, setSavingLocation] = useState(false)

  // Lista servizi predefiniti
  const availableAmenities = [
    "WiFi",
    "Parcheggio",
    "Aria condizionata",
    "Riscaldamento",
    "Cucina",
    "TV",
    "Lavatrice",
    "Asciugatrice",
    "Piscina",
    "Giardino",
    "Balcone",
    "Terrazza",
    "Camino",
    "Idromassaggio",
    "Palestra",
    "Sauna",
    "Colazione inclusa",
    "Animali ammessi",
    "Accesso disabili",
    "Servizio di pulizia",
    "Asciugamani",
    "Biancheria da letto",
    "Ferro da stiro",
    "Asciugacapelli",
    "Culla",
    "Seggiolone",
    "Mensa per bambini",
  ]

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    property_type: "apartment" as "apartment" | "house" | "b&b" | "hotel" | "villa" | "other",
    address: "",
    street_number: "",
    city: "",
    country: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
    is_active: true,
  })

  useEffect(() => {
    if (params.id) {
      loadProperty()
    }
  }, [params.id])

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .eq("owner_id", session?.user.id)
        .single()

      if (error) {
        // Only log non-expected errors (not "not found" errors)
        if (error.code !== "PGRST116" && error.code !== "PGRST301" && !error.message?.includes("406")) {
          console.error("Error loading property:", error)
        }
        // If property not found, redirect to dashboard
        if (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("406")) {
          router.push("/dashboard/host")
          return
        }
        throw error
      }

      if (!data) {
        router.push("/dashboard/host")
        return
      }

      // Parse address to separate street name and street number
      const address = data.address || ""
      // Try to extract street number (matches patterns like "123", "23/A", "15 bis", etc.)
      const streetNumberMatch = address.match(/\s+(\d+[\/\-]?[A-Za-z]?(\s+(bis|ter|quater))?)$/i)
      let parsedAddress = address
      let parsedStreetNumber = ""
      
      if (streetNumberMatch) {
        parsedStreetNumber = streetNumberMatch[1].trim()
        parsedAddress = address.substring(0, streetNumberMatch.index).trim()
      }

      setFormData({
        name: data.name || "",
        description: data.description || "",
        property_type: data.property_type || "apartment",
        address: parsedAddress,
        street_number: parsedStreetNumber,
        city: data.city || "",
        country: data.country || "",
        price_per_night: data.price_per_night?.toString() || "",
        max_guests: data.max_guests?.toString() || "",
        bedrooms: data.bedrooms?.toString() || "",
        bathrooms: data.bathrooms?.toString() || "",
        amenities: data.amenities || [],
        is_active: data.is_active ?? true,
      })
      
      // Load existing video URL if present
      if (data.video_url) {
        setExistingVideoUrl(data.video_url)
      }
      
      // Load existing coordinates if present
      if (data.latitude && data.longitude) {
        const location = { lat: data.latitude, lng: data.longitude }
        setCurrentLocation(location)
        setSelectedLocation(location)
      }
    } catch (error: any) {
      // Only log if it's not a "not found" error
      if (error?.code !== "PGRST116" && error?.code !== "PGRST301" && !error?.message?.includes("406")) {
        console.error("Error loading property:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare la proprietà",
          variant: "destructive",
        })
      }
      router.push("/dashboard/host")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Geocode address (combine address + street number)
      const streetAddress = formData.street_number 
        ? `${formData.address} ${formData.street_number}`.trim()
        : formData.address
      const fullAddress = `${streetAddress}, ${formData.city}, ${formData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)

      // Upload video if a new one was selected
      let videoUrl: string | null = existingVideoUrl
      const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

      if (video && blobToken) {
        setUploadingVideo(true)
        try {
          const { put } = await import("@vercel/blob")
          const fileExtension = video.name.split(".").pop()
          const fileName = `${session?.user.id}/properties/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
          const blob = await put(fileName, video, {
            access: "public",
            contentType: video.type,
            token: blobToken,
          })
          videoUrl = blob.url

          // Record video upload
          const fileSizeMB = video.size / (1024 * 1024)
          const recordResponse = await fetch("/api/video/record-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadType: "property",
              videoUrl: blob.url,
              fileSizeMb: fileSizeMB,
            }),
          })

          if (!recordResponse.ok) {
            const { error } = await recordResponse.json()
            throw new Error(error || "Errore nella registrazione del video")
          }
        } catch (uploadError: any) {
          console.error("Video upload error:", uploadError)
          toast({
            title: "Errore",
            description: uploadError.message || "Impossibile caricare il video",
            variant: "destructive",
          })
          setUploadingVideo(false)
          setSaving(false)
          return
        } finally {
          setUploadingVideo(false)
        }
      }

      // Usa le coordinate selezionate manualmente se disponibili, altrimenti geocodifica
      let finalLatitude: number | null = null
      let finalLongitude: number | null = null

      if (selectedLocation) {
        // Priorità alle coordinate selezionate manualmente
        finalLatitude = selectedLocation.lat
        finalLongitude = selectedLocation.lng
      } else if (geocodeResult) {
        // Fallback alla geocodifica
        finalLatitude = geocodeResult.lat
        finalLongitude = geocodeResult.lon
      } else if (currentLocation) {
        // Mantieni le coordinate esistenti se non c'è né selezione manuale né geocodifica
        finalLatitude = currentLocation.lat
        finalLongitude = currentLocation.lng
      }

      const { error } = await supabase
        .from("properties")
        .update({
          name: formData.name,
          description: formData.description,
          property_type: formData.property_type,
          address: formData.street_number 
            ? `${formData.address} ${formData.street_number}`.trim()
            : formData.address,
          city: formData.city,
          country: formData.country,
          latitude: finalLatitude,
          longitude: finalLongitude,
          price_per_night: parseFloat(formData.price_per_night),
          max_guests: parseInt(formData.max_guests),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          amenities: formData.amenities,
          is_active: formData.is_active,
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Proprietà aggiornata con successo!",
      })

      router.push("/dashboard/host")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addAmenity = () => {
    if (currentAmenity.trim() && !formData.amenities.includes(currentAmenity.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, currentAmenity.trim()],
      })
      setCurrentAmenity("")
    }
  }

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((a) => a !== amenity),
    })
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verifica dimensione (max 100MB)
    const maxSizeMB = 100
    const fileSizeMB = file.size / (1024 * 1024)
    
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "Errore",
        description: `Il video è troppo grande. Dimensione massima consentita: ${maxSizeMB}MB. Dimensione attuale: ${fileSizeMB.toFixed(2)}MB. Scegli un video più leggero.`,
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    // Verifica tipo file (solo video)
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Errore",
        description: "Seleziona un file video valido",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    // Verifica limite giornaliero (solo se non c'è già un video esistente)
    if (!existingVideoUrl) {
      try {
        const response = await fetch("/api/video/check-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadType: "property" }),
        })

        const { canUpload, error } = await response.json()

        if (!canUpload) {
          toast({
            title: "Limite raggiunto",
            description: error || "Hai già caricato un video oggi. Limite: 1 video al giorno per tipo.",
            variant: "destructive",
          })
          e.target.value = ""
          return
        }
      } catch (error) {
        console.error("Error checking video limit:", error)
        toast({
          title: "Errore",
          description: "Impossibile verificare il limite video. Riprova.",
          variant: "destructive",
        })
        e.target.value = ""
        return
      }
    }

    setVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setVideo(null)
    setVideoPreview(null)
    setExistingVideoUrl(null)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen p-8 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Modifica struttura</h1>
            <p className="text-muted-foreground">Aggiorna i dettagli della tua proprietà</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/host">Torna alla dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni base</CardTitle>
            <CardDescription>Modifica i dettagli della tua struttura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome struttura *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Tipo struttura *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, property_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Appartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="b&b">B&B</SelectItem>
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
                    value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Via/Strada *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  placeholder="Es: Via Roma, Corso Garibaldi..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street_number">Numero Civico</Label>
                <Input
                  id="street_number"
                  value={formData.street_number}
                  onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                  placeholder="Es: 15, 23/A..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Paese *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Posizione sulla mappa</Label>
                  <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Inizializza con la posizione corrente se disponibile
                          if (currentLocation) {
                            setSelectedLocation(currentLocation)
                          }
                        }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Riposiziona sulla mappa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Riposiziona struttura sulla mappa</DialogTitle>
                        <DialogDescription>
                          Clicca sulla mappa per selezionare la posizione esatta della struttura. 
                          Puoi anche cercare l'indirizzo e poi regolare la posizione.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const streetAddress = formData.street_number 
                                ? `${formData.address} ${formData.street_number}`.trim()
                                : formData.address
                              const fullAddress = `${streetAddress}, ${formData.city}, ${formData.country}`
                              
                              if (!formData.address || !formData.city || !formData.country) {
                                toast({
                                  title: "Errore",
                                  description: "Compila prima l'indirizzo, la città e il paese",
                                  variant: "destructive",
                                })
                                return
                              }

                              const geocodeResult = await geocodeAddress(fullAddress)
                              if (geocodeResult) {
                                const location = { lat: geocodeResult.lat, lng: geocodeResult.lon }
                                setSelectedLocation(location)
                                toast({
                                  title: "Posizione trovata",
                                  description: "Clicca sulla mappa per regolare la posizione esatta",
                                })
                              } else {
                                toast({
                                  title: "Errore",
                                  description: "Impossibile trovare l'indirizzo. Seleziona manualmente la posizione sulla mappa.",
                                  variant: "destructive",
                                })
                              }
                            }}
                            disabled={savingLocation || !formData.address || !formData.city || !formData.country}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Cerca indirizzo
                          </Button>
                        </div>
                        <LocationPickerMap
                          initialPosition={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null}
                          onLocationSelect={(lat, lng) => {
                            setSelectedLocation({ lat, lng })
                          }}
                          height="500px"
                        />
                        {selectedLocation && (
                          <p className="text-sm text-muted-foreground">
                            Posizione selezionata: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowLocationDialog(false)
                              // Ripristina la posizione originale se non salvata
                              if (currentLocation) {
                                setSelectedLocation(currentLocation)
                              }
                            }}
                            disabled={savingLocation}
                          >
                            Annulla
                          </Button>
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!selectedLocation) {
                                toast({
                                  title: "Errore",
                                  description: "Seleziona una posizione sulla mappa",
                                  variant: "destructive",
                                })
                                return
                              }

                              setSavingLocation(true)
                              try {
                                const { error } = await supabase
                                  .from("properties")
                                  .update({
                                    latitude: selectedLocation.lat,
                                    longitude: selectedLocation.lng,
                                    updated_at: new Date().toISOString(),
                                  })
                                  .eq("id", params.id)

                                if (error) throw error

                                setCurrentLocation(selectedLocation)
                                setShowLocationDialog(false)
                                
                                toast({
                                  title: "Successo",
                                  description: "Posizione aggiornata con successo!",
                                })
                              } catch (error: any) {
                                toast({
                                  title: "Errore",
                                  description: error.message || "Impossibile aggiornare la posizione",
                                  variant: "destructive",
                                })
                              } finally {
                                setSavingLocation(false)
                              }
                            }}
                            disabled={savingLocation || !selectedLocation}
                          >
                            {savingLocation ? "Salvataggio..." : "Salva posizione"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {currentLocation && (
                  <p className="text-sm text-muted-foreground">
                    Posizione attuale: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                )}
                {!currentLocation && (
                  <p className="text-sm text-muted-foreground">
                    Nessuna posizione impostata. Clicca su "Riposiziona sulla mappa" per impostare la posizione.
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_guests">Ospiti massimi *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Camere da letto</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bagni</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
              </div>

              {/* Video upload (solo per host) */}
              <div className="space-y-2">
                <Label htmlFor="video">Video della struttura (max 100MB, 1 al giorno)</Label>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="video"
                    className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed rounded-lg hover:bg-accent transition-colors"
                  >
                    <VideoIcon className="w-4 h-4" />
                    {existingVideoUrl ? "Sostituisci video" : "Carica video"}
                  </Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    disabled={uploadingVideo || saving}
                  />
                </div>
                {uploadingVideo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Caricamento video in corso...
                  </div>
                )}
                {(videoPreview || existingVideoUrl) && (
                  <div className="relative mt-2">
                    <video
                      src={videoPreview || existingVideoUrl || undefined}
                      controls
                      className="w-full rounded-lg max-h-64"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                      disabled={saving || uploadingVideo}
                    >
                      <X className="w-4 h-4" />
                    </button>
                            {video && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Dimensione: {(video.size / (1024 * 1024)).toFixed(2)}MB
                              </p>
                            )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Limite: 1 video al giorno. Dimensione massima: 100MB.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Servizi</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Seleziona i servizi disponibili nella tua struttura
                </p>
                
                {/* Servizi selezionati */}
                {formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm flex items-center gap-2"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="hover:bg-primary/80 rounded-full p-0.5"
                          disabled={saving}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Servizi predefiniti */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Servizi comuni:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableAmenities
                      .filter((amenity) => !formData.amenities.includes(amenity))
                      .map((amenity) => (
                        <Button
                          key={amenity}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!formData.amenities.includes(amenity)) {
                              setFormData({
                                ...formData,
                                amenities: [...formData.amenities, amenity],
                              })
                            }
                          }}
                          disabled={saving}
                        >
                          {amenity}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Input per servizi personalizzati */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Aggiungi servizio personalizzato:</p>
                  <div className="flex gap-2">
                    <Input
                      id="amenities"
                      value={currentAmenity}
                      onChange={(e) => setCurrentAmenity(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addAmenity()
                        }
                      }}
                      placeholder="Es: WiFi veloce, Piscina riscaldata..."
                    />
                    <Button type="button" onClick={addAmenity} disabled={saving}>
                      Aggiungi
                    </Button>
                  </div>
                </div>

                {formData.amenities.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nessun servizio selezionato
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">Proprietà attiva (visibile nel marketplace)</Label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

