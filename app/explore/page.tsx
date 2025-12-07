"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { Star, Users, MapPin, Map as MapIcon, List, Search } from "lucide-react"

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map"), { ssr: false })

interface Property {
  id: string
  name: string
  description: string
  property_type: string
  city: string
  country: string
  latitude: number
  longitude: number
  price_per_night: number
  max_guests: number
  images: string[]
  rating: number
  review_count: number
}

export default function ExplorePage() {
  const supabase = createSupabaseClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [viewMode, setViewMode] = useState<"map" | "feed">("map")
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error("Error loading properties:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    if (viewMode === "map") {
      // Switch to feed view and scroll to property
      setViewMode("feed")
      setTimeout(() => {
        const element = document.getElementById(`property-${property.id}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    } else {
      // Scroll to property in feed
      const element = document.getElementById(`property-${property.id}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Nomadiqe App'
          }
        }
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const location = data[0]
        const lat = parseFloat(location.lat)
        const lon = parseFloat(location.lon)
        setMapCenter([lat, lon])
      }
    } catch (error) {
      console.error("Error geocoding location:", error)
    }
  }

  // Map View - Full Screen
  if (viewMode === "map") {
    return (
      <div className="fixed inset-0 w-full h-[100dvh] md:h-screen overflow-hidden">
        {/* Search Bar - Fixed overlay at top */}
        <div className="fixed top-0 md:top-16 left-0 right-0 z-[100] p-4 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex gap-2 items-center max-w-2xl mx-auto">
            <form 
              onSubmit={(e) => { 
                e.preventDefault()
                handleLocationSearch()
              }}
              className="flex gap-2 items-center flex-1"
            >
              <Input
                placeholder="Cerca per nome, città o paese..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                variant="outline"
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Button
              onClick={() => setViewMode("feed")}
              className="shrink-0"
              variant="outline"
            >
              <List className="h-4 w-4 mr-2" />
              Feed View
            </Button>
          </div>
          {searchQuery && filteredProperties.length > 0 && (
            <div className="text-xs text-center mt-2 text-muted-foreground">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'risultato trovato' : 'risultati trovati'}
            </div>
          )}
        </div>

        {/* Map - Full Screen (bottom nav will overlay on top with z-index) */}
        <div 
          className="absolute inset-0 w-full h-full z-0"
          style={{ 
            touchAction: 'pan-x pan-y pinch-zoom',
            overscrollBehavior: 'none'
          }}
          onWheel={(e) => {
            // Prevent wheel events from causing page scroll
            const target = e.target as HTMLElement
            if (target.closest('.leaflet-container') || target.closest('.leaflet-pane')) {
              e.stopPropagation()
            }
          }}
        >
          <MapComponent
            properties={filteredProperties}
            onPropertySelect={handlePropertySelect}
            center={mapCenter || undefined}
          />
        </div>
      </div>
    )
  }

  // Feed View
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Bar - Sticky at top */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto p-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Cerca per nome, città o paese..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => setViewMode("map")}
              variant="outline"
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map View
            </Button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Caricamento strutture...</div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              Nessuna struttura trovata
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              {filteredProperties.length} {filteredProperties.length === 1 ? "struttura trovata" : "strutture trovate"}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <Card
                  key={property.id}
                  id={`property-${property.id}`}
                  className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                    selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedProperty(property)}
                >
                  {/* Property Image */}
                  <div className="relative w-full h-64 overflow-hidden">
                    {property.images && property.images.length > 0 ? (
                      <Image
                        src={property.images[0]}
                        alt={property.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {/* Price Badge */}
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <span className="text-lg font-bold">€{property.price_per_night}</span>
                      <span className="text-xs text-muted-foreground">/notte</span>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{property.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.city}, {property.country}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        {property.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {property.rating.toFixed(1)}
                            </span>
                            {property.review_count > 0 && (
                              <span className="text-muted-foreground">
                                ({property.review_count})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{property.max_guests} ospiti</span>
                        </div>
                      </div>

                      <Button asChild className="w-full mt-4" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/properties/${property.id}`}>Vedi dettagli</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toggle Button */}
      <Button
        onClick={() => setViewMode("map")}
        className="fixed bottom-20 right-4 z-10 md:hidden rounded-full h-14 w-14 shadow-lg"
        size="icon"
      >
        <MapIcon className="h-6 w-6" />
        <span className="sr-only">Map View</span>
      </Button>
    </div>
  )
}
