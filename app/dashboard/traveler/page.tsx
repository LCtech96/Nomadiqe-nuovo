"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Calendar, MapPin, Euro } from "lucide-react"

interface Booking {
  id: string
  property_id: string
  check_in: string
  check_out: string
  guests: number
  total_price: number
  status: string
  property: {
    name: string
    city: string
    country: string
  }
}

export default function TravelerDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)

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
          property:properties(id, name, city, country)
        `)
        .eq("traveler_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (bookingsError) throw bookingsError
      setBookings(bookingsData || [])

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

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Traveler</h1>
          <p className="text-muted-foreground">Gestisci i tuoi viaggi e prenotazioni</p>
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
              <CardTitle>Prenotazioni attive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {bookings.filter((b) => b.status === "confirmed").length}
              </p>
              <p className="text-sm text-muted-foreground">Prenotazioni confermate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totale prenotazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings.length}</p>
              <p className="text-sm text-muted-foreground">Tutte le prenotazioni</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button asChild>
            <Link href="/explore">Esplora alloggi</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Le tue prenotazioni</CardTitle>
            <CardDescription>Storico delle tue prenotazioni</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna prenotazione ancora. Inizia a esplorare!
              </p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
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
                              {booking.total_price}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : booking.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {booking.status === "confirmed"
                              ? "Confermata"
                              : booking.status === "pending"
                              ? "In attesa"
                              : booking.status}
                          </span>
                        </div>
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



