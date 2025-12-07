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
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)

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
          title: "Errore",
          description: "Impossibile caricare la proprietà",
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
        title: "Errore",
        description: "Seleziona le date di check-in e check-out",
        variant: "destructive",
      })
      return
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalPrice = nights * property!.price_per_night

    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          property_id: property!.id,
          traveler_id: session.user.id,
          check_in: checkIn,
          check_out: checkOut,
          guests: guests,
          total_price: totalPrice,
          status: "pending",
        })
        .select()
        .single()

      if (error) throw error

      // Award booking points
      await supabase.from("points_history").insert({
        user_id: session.user.id,
        points: 50,
        action_type: "booking",
        description: "Prenotazione completata",
      })

      toast({
        title: "Successo",
        description: "Prenotazione creata con successo!",
      })

      router.push("/dashboard/traveler/bookings")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{property.name}</h1>
              <p className="text-muted-foreground">
                {property.city}, {property.country}
              </p>
            </div>

            {property.images && property.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                <div className="col-span-2">
                  <Image
                    src={property.images[0]}
                    alt={property.name}
                    width={800}
                    height={400}
                    className="w-full h-96 object-cover"
                  />
                </div>
                {property.images.slice(1, 3).map((img, idx) => (
                  <Image
                    key={idx}
                    src={img}
                    alt={`${property.name} ${idx + 2}`}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Descrizione</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{property.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dettagli</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-semibold">{property.property_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ospiti massimi</p>
                    <p className="font-semibold">{property.max_guests}</p>
                  </div>
                  {property.bedrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Camere da letto</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bagni</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Servizi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-secondary rounded-full text-sm"
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
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Prenota</CardTitle>
                <CardDescription>
                  €{property.price_per_night} per notte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests">Ospiti</Label>
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
                      <span>Totale</span>
                      <span>€{totalPrice}</span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleBooking}
                  className="w-full"
                  disabled={!checkIn || !checkOut || nights <= 0}
                >
                  Prenota
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

