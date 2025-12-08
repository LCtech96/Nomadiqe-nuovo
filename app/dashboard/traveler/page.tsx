"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin, Euro, Heart, Bookmark, Plane } from "lucide-react"

interface Booking {
  id: string
  property_id: string
  check_in: string
  check_out: string
  guests: number
  total_price: number
  status: string
  property: {
    id: string
    name: string
    city: string
    country: string
    images: string[] | null
  }
}

interface Property {
  id: string
  name: string
  city: string
  country: string
  images: string[] | null
  price_per_night: number
}

export default function TravelerDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [likedProperties, setLikedProperties] = useState<Property[]>([])
  const [savedProperties, setSavedProperties] = useState<Property[]>([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"liked" | "saved" | "trips">("liked")

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    try {
      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          property:properties(id, name, city, country, images)
        `)
        .eq("traveler_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (bookingsError) throw bookingsError
      setBookings(bookingsData || [])

      // Load liked properties
      const { data: likedData, error: likedError } = await supabase
        .from("property_likes")
        .select(`
          property_id,
          property:properties(id, name, city, country, images, price_per_night)
        `)
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (!likedError && likedData) {
        const properties = likedData
          .map((item: any) => item.property)
          .filter((p: any) => p !== null)
        setLikedProperties(properties)
      }

      // Load saved properties
      const { data: savedData, error: savedError } = await supabase
        .from("saved_properties")
        .select(`
          property_id,
          property:properties(id, name, city, country, images, price_per_night)
        `)
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (!savedError && savedData) {
        const properties = savedData
          .map((item: any) => item.property)
          .filter((p: any) => p !== null)
        setSavedProperties(properties)
      }

      // Load points
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", session!.user.id)
        .single()

      if (profile) {
        setPoints(profile.points)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  const completedTrips = bookings.filter((b) => b.status === "completed")

  return (
    <div className="min-h-screen p-8 pb-20">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Traveler</h1>
          <p className="text-muted-foreground">Gestisci i tuoi viaggi, preferenze e prenotazioni</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>I tuoi punti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{points}</p>
              <p className="text-sm text-muted-foreground">Punti disponibili</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strutture salvate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{savedProperties.length}</p>
              <p className="text-sm text-muted-foreground">Preferite</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Viaggi effettuati</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{completedTrips.length}</p>
              <p className="text-sm text-muted-foreground">Completati</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button asChild>
            <Link href="/explore">Esplora alloggi</Link>
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("liked")}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === "liked"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Mi piace ({likedProperties.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === "saved"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Salvate ({savedProperties.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("trips")}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === "trips"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Viaggi ({completedTrips.length})
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "liked" && (
          <Card>
            <CardHeader>
              <CardTitle>Strutture che ti piacciono</CardTitle>
              <CardDescription>Le strutture a cui hai messo mi piace</CardDescription>
            </CardHeader>
            <CardContent>
              {likedProperties.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna struttura con mi piace. Inizia a esplorare!
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likedProperties.map((property) => (
                    <Link key={property.id} href={`/properties/${property.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-0">
                          <div className="relative w-full h-48">
                            {property.images && property.images.length > 0 ? (
                              <Image
                                src={property.images[0]}
                                alt={property.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover rounded-t-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                                <MapPin className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold mb-1 truncate">{property.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {property.city}, {property.country}
                            </p>
                            {property.price_per_night && (
                              <p className="text-lg font-bold">
                                €{property.price_per_night}/notte
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "saved" && (
          <Card>
            <CardHeader>
              <CardTitle>Strutture salvate</CardTitle>
              <CardDescription>Le tue strutture preferite</CardDescription>
            </CardHeader>
            <CardContent>
              {savedProperties.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna struttura salvata. Inizia a salvare le tue preferite!
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProperties.map((property) => (
                    <Link key={property.id} href={`/properties/${property.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-0">
                          <div className="relative w-full h-48">
                            {property.images && property.images.length > 0 ? (
                              <Image
                                src={property.images[0]}
                                alt={property.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover rounded-t-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                                <MapPin className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold mb-1 truncate">{property.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {property.city}, {property.country}
                            </p>
                            {property.price_per_night && (
                              <p className="text-lg font-bold">
                                €{property.price_per_night}/notte
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "trips" && (
          <Card>
            <CardHeader>
              <CardTitle>Viaggi effettuati</CardTitle>
              <CardDescription>Storico dei tuoi viaggi completati</CardDescription>
            </CardHeader>
            <CardContent>
              {completedTrips.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessun viaggio completato ancora.
                </p>
              ) : (
                <div className="space-y-4">
                  {completedTrips.map((booking) => (
                    <Link key={booking.id} href={`/properties/${booking.property.id}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex gap-4">
                            {booking.property.images && booking.property.images.length > 0 && (
                              <div className="relative w-32 h-32 shrink-0">
                                <Image
                                  src={booking.property.images[0]}
                                  alt={booking.property.name}
                                  fill
                                  sizes="128px"
                                  className="object-cover rounded-lg"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">
                                {booking.property.name}
                              </h3>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {booking.property.city}, {booking.property.country}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(booking.check_in).toLocaleDateString("it-IT")} -{" "}
                                  {new Date(booking.check_out).toLocaleDateString("it-IT")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Euro className="w-4 h-4" />
                                  {booking.total_price} totale
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}



