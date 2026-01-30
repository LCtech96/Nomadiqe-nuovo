"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { usePropertyTranslations } from "@/lib/hooks/use-property-translations"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

interface Property {
  id: string
  name: string
  description: string
  property_type: string
  address: string
  city: string
  country: string
  price_per_night: number
  max_guests: number
  bedrooms: number
  bathrooms: number
  amenities: string[]
  images: string[]
  rating: number
  review_count: number
  owner_id?: string
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const { t, locale } = useI18n()
  const supabase = createSupabaseClient()
  const [property, setProperty] = useState<Property | null>(null)
  const { translatedName, translatedDescription } = usePropertyTranslations(property)
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    if (params.id) {
      loadProperty()
    }
  }, [params.id, locale]) // Ricarica quando cambia la lingua

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) {
        // Only log non-expected errors (not "not found" errors)
        if (error.code !== "PGRST116" && error.code !== "PGRST301" && !error.message?.includes("406")) {
          console.error("Error loading property:", error)
        }
        // If property not found, redirect to explore
        if (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("406")) {
          toast({
            title: "Proprietà non trovata",
            description: "La proprietà che stai cercando non esiste più o non è disponibile.",
            variant: "destructive",
          })
          router.push("/explore")
          return
        }
        throw error
      }
      
      if (!data) {
        toast({
          title: "Proprietà non trovata",
          description: "La proprietà che stai cercando non esiste più o non è disponibile.",
          variant: "destructive",
        })
        router.push("/explore")
        return
      }
      
      setProperty(data)
    } catch (error: any) {
      // Only log if it's not a "not found" error or 406 error
      if (error?.code !== "PGRST116" && error?.code !== "PGRST301" && !error?.message?.includes("406")) {
        console.error("Error loading property:", error)
        toast({
          title: t('general.error'),
          description: t('property.loadingError'),
          variant: "destructive",
        })
      } else {
        // Silently redirect for not found errors
        router.push("/explore")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = async () => {
    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (!checkIn || !checkOut) {
      toast({
        title: t('general.error'),
        description: t('property.selectDates'),
        variant: "destructive",
      })
      return
    }

    if (!property?.owner_id) {
      toast({
        title: "Errore",
        description: "Impossibile trovare il proprietario della proprietà",
        variant: "destructive",
      })
      return
    }

    // Impedisci all'host di prenotare la propria struttura
    if (property.owner_id === session.user.id) {
      toast({
        title: t('general.error'),
        description: t('property.cannotBookOwn'),
        variant: "destructive",
      })
      return
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalPrice = nights * property!.price_per_night

    try {
      // Invia richiesta di prenotazione come messaggio all'host
      const bookingRequestData = {
        property_id: property.id,
        property_name: property.name,
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
        total_price: totalPrice,
        nights: nights,
      }

      const messageContent = `Nuova richiesta di prenotazione per "${translatedName}"

Check-in: ${new Date(checkIn).toLocaleDateString("it-IT")}
Check-out: ${new Date(checkOut).toLocaleDateString("it-IT")}
Notti: ${nights}
Ospiti: ${guests}
Totale: €${totalPrice.toFixed(2)}

Clicca su "Accetta" o "Rifiuta" per rispondere alla richiesta.`

      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: property.owner_id,
          content: messageContent,
          read: false,
          booking_request_data: bookingRequestData,
          booking_request_status: "pending",
        })
        .select()
        .single()

      if (messageError) throw messageError

      toast({
        title: t('general.success'),
        description: t('property.bookingRequestSent'),
      })

      router.push("/messages")
    } catch (error: any) {
      console.error("Error sending booking request:", error)
      toast({
        title: t('general.error'),
        description: error.message || t('property.bookingRequestError'),
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>
  }

  if (!property) {
    return <div className="min-h-screen flex items-center justify-center">Proprietà non trovata</div>
  }

  const checkInDate = checkIn ? new Date(checkIn) : null
  const checkOutDate = checkOut ? new Date(checkOut) : null
  const nights = checkInDate && checkOutDate
    ? Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const totalPrice = nights * property.price_per_night

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index)
    setImageViewerOpen(true)
  }

  const nextImage = () => {
    if (!property?.images) return
    setSelectedImageIndex((prev) => (prev + 1) % property.images.length)
  }

  const prevImage = () => {
    if (!property?.images) return
    setSelectedImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)
  }

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
      </div>

      <div className="container mx-auto p-4">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{translatedName || property.name}</h1>
              <p className="text-muted-foreground">
                {property.city}, {property.country}
              </p>
            </div>

            {property.images && property.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                <div 
                  className="col-span-2 cursor-pointer relative group"
                  onClick={() => openImageViewer(0)}
                >
                  <Image
                    src={property.images[0]}
                    alt={property.name}
                    width={800}
                    height={400}
                    className="w-full h-96 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                      Clicca per vedere tutte le immagini
                    </span>
                  </div>
                </div>
                {property.images.slice(1, 3).map((img, idx) => (
                  <div
                    key={idx}
                    className="cursor-pointer relative group"
                    onClick={() => openImageViewer(idx + 1)}
                  >
                    <Image
                      src={img}
                      alt={`${translatedName} ${idx + 2}`}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                ))}
              </div>
            )}

            <Card className="bg-card dark:bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-foreground">{t('property.description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">
                  {translatedDescription ?? property.description ?? t('property.noDescription')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-foreground">{t('property.details')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-semibold text-foreground">{property.property_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('property.maxGuests')}</p>
                    <p className="font-semibold text-foreground">{property.max_guests}</p>
                  </div>
                  {property.bedrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Camere da letto</p>
                      <p className="font-semibold text-foreground">{property.bedrooms}</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bagni</p>
                      <p className="font-semibold text-foreground">{property.bathrooms}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {property.amenities && property.amenities.length > 0 && (
              <Card className="bg-card dark:bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-foreground">{t('property.services')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-secondary dark:bg-gray-800 rounded-full text-sm text-foreground"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-4 bg-card dark:bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-foreground">{t('property.book')}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  €{property.price_per_night} per notte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">{t('property.checkIn')}</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">{t('property.checkOut')}</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split("T")[0]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests">{t('property.guests')}</Label>
                  <Input
                    id="guests"
                    type="number"
                    min={1}
                    max={property.max_guests}
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                  />
                </div>
                {nights > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span>€{property.price_per_night} x {nights} notti</span>
                      <span>€{totalPrice}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t('property.total')}</span>
                      <span>€{totalPrice}</span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleBooking}
                  className="w-full"
                  disabled={!checkIn || !checkOut || nights <= 0}
                >
                  {t('property.book')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setImageViewerOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous Button */}
            {property.images && property.images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            {property.images && property.images[selectedImageIndex] && (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={property.images[selectedImageIndex]}
                  alt={`${translatedName} ${selectedImageIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            )}

            {/* Next Button */}
            {property.images && property.images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image Counter */}
            {property.images && property.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {selectedImageIndex + 1} / {property.images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

