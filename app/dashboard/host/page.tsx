"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Plus, Home, Users } from "lucide-react"

interface Property {
  id: string
  name: string
  city: string
  country: string
  price_per_night: number
  is_active: boolean
  booking_count: number
}

export default function HostDashboard() {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadProperties()
    }
  }, [session])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get booking counts
      const propertiesWithBookings = await Promise.all(
        (data || []).map(async (property) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("property_id", property.id)
            .eq("status", "confirmed")

          return {
            ...property,
            booking_count: count || 0,
          }
        })
      )

      setProperties(propertiesWithBookings)
    } catch (error) {
      console.error("Error loading properties:", error)
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard Host</h1>
            <p className="text-muted-foreground">Gestisci le tue strutture</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/host/properties/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuova struttura
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Strutture totali</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{properties.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strutture attive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {properties.filter((p) => p.is_active).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prenotazioni totali</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {properties.reduce((sum, p) => sum + p.booking_count, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Le tue strutture</CardTitle>
            <CardDescription>Gestisci le tue proprietà</CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <div className="text-center py-8">
                <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Non hai ancora pubblicato nessuna struttura
                </p>
                <Button asChild>
                  <Link href="/dashboard/host/properties/new">Crea la prima struttura</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription>
                        {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-2xl font-bold">€{property.price_per_night}</p>
                        <p className="text-sm text-muted-foreground">per notte</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{property.booking_count} prenotazioni</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/dashboard/host/properties/${property.id}`}>
                            Modifica
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/properties/${property.id}`}>Vedi</Link>
                        </Button>
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

