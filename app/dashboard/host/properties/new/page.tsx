"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { X, Upload, VideoIcon, Loader2 } from "lucide-react"
import ImageCropper from "@/components/image-cropper"

export default function NewPropertyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)

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
  })

  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageFileToCrop, setImageFileToCrop] = useState<File | null>(null)
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setUploadingImages(true)
    try {
      // Geocode address (combine address + street number)
      const streetAddress = formData.street_number 
        ? `${formData.address} ${formData.street_number}`.trim()
        : formData.address
      const fullAddress = `${streetAddress}, ${formData.city}, ${formData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)

      if (!geocodeResult) {
        toast({
          title: "Attenzione",
          description: "Impossibile geocodificare l'indirizzo. La proprietà verrà salvata senza coordinate.",
        })
      }

      // Upload video or images to Vercel Blob
      let videoUrl: string | null = null
      const imageUrls: string[] = []
      const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

      // Upload video if present (only for hosts)
      if (video && blobToken) {
        setUploadingVideo(true)
        try {
          const { put } = await import("@vercel/blob")
          const fileExtension = video.name.split(".").pop()
          const fileName = `${session.user.id}/properties/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
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
          setLoading(false)
          return
        } finally {
          setUploadingVideo(false)
        }
      }

      if (images.length > 0) {
        if (!blobToken) {
          toast({
            title: "Errore",
            description: "Token Vercel Blob non configurato. Le immagini non verranno caricate.",
            variant: "destructive",
          })
        } else {
          try {
            const { put } = await import("@vercel/blob")
            
            for (const image of images) {
              try {
                const fileExtension = image.name.split(".").pop()
                const fileName = `${session.user.id}/properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
                
                const blob = await put(fileName, image, {
                  access: "public",
                  contentType: image.type,
                  token: blobToken,
                })
                
                imageUrls.push(blob.url)
              } catch (uploadError: any) {
                console.error("Image upload error:", uploadError)
                toast({
                  title: "Attenzione",
                  description: `Errore nel caricamento di ${image.name}. Continuo con le altre.`,
                  variant: "destructive",
                })
              }
            }
          } catch (importError) {
            console.error("Error importing Vercel Blob:", importError)
            toast({
              title: "Errore",
              description: "Errore nel caricamento delle immagini. La proprietà verrà salvata senza immagini.",
              variant: "destructive",
            })
          }
        }
      }

      setUploadingImages(false)

      // Usa l'API route server-side per creare la proprietà (bypassa problemi di autenticazione Supabase)
      const response = await fetch("/api/properties/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          title: formData.name,
          description: formData.description,
          property_type: formData.property_type,
          address: formData.street_number 
            ? `${formData.address} ${formData.street_number}`.trim()
            : formData.address,
          city: formData.city,
          country: formData.country,
          latitude: geocodeResult?.lat || null,
          longitude: geocodeResult?.lon || null,
          price_per_night: formData.price_per_night,
          max_guests: formData.max_guests,
          bedrooms: formData.bedrooms || null,
          bathrooms: formData.bathrooms || null,
          location_data: {
            property_type: formData.property_type,
            address: formData.address,
            city: formData.city,
            country: formData.country,
            latitude: geocodeResult?.lat || null,
            longitude: geocodeResult?.lon || null,
            price_per_night: parseFloat(formData.price_per_night),
            max_guests: parseInt(formData.max_guests),
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          },
          amenities: formData.amenities,
          images: imageUrls,
          video_url: videoUrl || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore nella creazione della proprietà")
      }

      const { data } = await response.json()

      toast({
        title: "Successo",
        description: "Proprietà creata con successo!",
      })

      router.push(`/dashboard/host/properties/${data.id}`)
    } catch (error: any) {
      setUploadingImages(false)
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
    if (formData.amenities.includes(amenity)) {
      // Rimuovi se già presente
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      })
    } else {
      // Aggiungi se non presente
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 10) {
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
    
    setImages([...images, croppedFile])
    setImagePreviews([...imagePreviews, newPreview])

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
    // Revoca l'URL dell'anteprima per liberare memoria
    URL.revokeObjectURL(imagePreviews[index])
    
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    setImages(newImages)
    setImagePreviews(newPreviews)
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

    // Verifica limite giornaliero
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
  }

  return (
    <>
    <div className="min-h-screen p-8 dark:bg-gray-900">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nuova struttura</h1>
          <p className="text-muted-foreground">Aggiungi una nuova proprietà al tuo portfolio</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni base</CardTitle>
            <CardDescription>Compila i dettagli della tua struttura</CardDescription>
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
                  placeholder="Es. Appartamento nel centro di Roma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descrivi la tua struttura..."
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

              <div className="space-y-2">
                <Label>Immagini della struttura</Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label
                      htmlFor="images"
                      className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-dashed rounded-lg hover:bg-accent transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Carica immagini
                    </Label>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={loading || uploadingImages}
                    />
                    <span className="text-sm text-muted-foreground">
                      {images.length}/10 immagini
                    </span>
                  </div>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={loading || uploadingImages}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {uploadingImages && (
                    <p className="text-sm text-muted-foreground">
                      Caricamento immagini in corso...
                    </p>
                  )}
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
                    Carica video
                  </Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    disabled={!!video || uploadingVideo || loading}
                  />
                </div>
                {uploadingVideo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Caricamento video in corso...
                  </div>
                )}
                {videoPreview && (
                  <div className="relative mt-2">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full rounded-lg max-h-64"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                      disabled={loading || uploadingVideo}
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
                <Label>Servizi</Label>
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
                          onClick={() => toggleAmenity(amenity)}
                          className="hover:bg-primary/80 rounded-full p-0.5"
                          disabled={loading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Menu a tendina servizi */}
                <Select
                  onValueChange={(value) => toggleAmenity(value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un servizio da aggiungere" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAmenities
                      .filter((amenity) => !formData.amenities.includes(amenity))
                      .map((amenity) => (
                        <SelectItem key={amenity} value={amenity}>
                          {amenity}
                        </SelectItem>
                      ))}
                    {availableAmenities.filter((amenity) => !formData.amenities.includes(amenity)).length === 0 && (
                      <SelectItem value="no-more" disabled>
                        Tutti i servizi sono stati aggiunti
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {formData.amenities.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nessun servizio selezionato
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading || uploadingImages} className="flex-1">
                  {loading || uploadingImages
                    ? uploadingImages
                      ? "Caricamento immagini..."
                      : "Salvataggio..."
                    : "Crea struttura"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
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

