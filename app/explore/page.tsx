"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { Star, Users, MapPin, Map as MapIcon, List, Search, Filter, X, Calendar, Euro, Wifi, Car, Heart, RefreshCw } from "lucide-react"

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
  amenities?: string[]
}

export default function ExplorePage() {
  const supabase = createSupabaseClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [viewMode, setViewMode] = useState<"map" | "feed">("map")
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  
  // Filtri avanzati
  const [showFilters, setShowFilters] = useState(false)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [availableProperties, setAvailableProperties] = useState<string[]>([])

  useEffect(() => {
    loadProperties()
  }, [])

  // Ricarica le proprietà quando la pagina torna in focus (per aggiornare le coordinate)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProperties()
      }
    }

    const handleFocus = () => {
      loadProperties()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Ricarica le proprietà quando si passa alla vista mappa (per mostrare posizioni aggiornate)
  useEffect(() => {
    if (viewMode === 'map') {
      loadProperties()
    }
  }, [viewMode])

  // Refresh periodico delle proprietà ogni 30 secondi quando si è in vista mappa
  useEffect(() => {
    if (viewMode !== 'map') return

    const interval = setInterval(() => {
      loadProperties()
    }, 30000) // 30 secondi

    return () => clearInterval(interval)
  }, [viewMode])

  // Carica proprietà disponibili per le date selezionate
  useEffect(() => {
    if (checkIn && checkOut) {
      loadAvailableProperties()
    } else {
      setAvailableProperties([])
    }
  }, [checkIn, checkOut])

  const loadProperties = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        // Rimuoviamo il limite per mostrare tutte le properties
        // .limit(50)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error("Error loading properties:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableProperties = async () => {
    if (!checkIn || !checkOut) return
    
    try {
      // Carica tutte le prenotazioni confermate che si sovrappongono con il range di date
      const { data: bookings } = await supabase
        .from("bookings")
        .select("property_id, check_in, check_out")
        .in("status", ["confirmed", "pending"])

      // Filtra prenotazioni che si sovrappongono con checkIn-checkOut
      const overlappingBookings = (bookings || []).filter(booking => {
        const bookingCheckIn = new Date(booking.check_in)
        const bookingCheckOut = new Date(booking.check_out)
        const searchCheckIn = new Date(checkIn)
        const searchCheckOut = new Date(checkOut)
        
        // Sovrapposizione: booking inizia prima che la ricerca finisca E booking finisce dopo che la ricerca inizia
        return bookingCheckIn <= searchCheckOut && bookingCheckOut >= searchCheckIn
      })

      const bookedPropertyIds = new Set(overlappingBookings.map(b => b.property_id))
      
      // Carica disponibilità per le date (tutte le date nel range devono essere disponibili)
      const { data: availability } = await supabase
        .from("property_availability")
        .select("property_id, date")
        .gte("date", checkIn)
        .lte("date", checkOut)

      // Raggruppa per property_id e verifica che tutte le date siano disponibili
      const availabilityByProperty = new Map<string, Set<string>>()
      availability?.forEach(a => {
        if (!availabilityByProperty.has(a.property_id)) {
          availabilityByProperty.set(a.property_id, new Set())
        }
        availabilityByProperty.get(a.property_id)?.add(a.date)
      })

      // Genera tutte le date nel range
      const dateRange: string[] = []
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const current = new Date(start)
      while (current <= end) {
        dateRange.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }

      // Filtra proprietà che hanno tutte le date disponibili E non sono prenotate
      const allPropertyIds = properties.map(p => p.id)
      const filtered = allPropertyIds.filter(id => {
        if (bookedPropertyIds.has(id)) return false
        
        const propertyDates = availabilityByProperty.get(id) || new Set()
        // Verifica che tutte le date nel range siano disponibili
        return dateRange.every(date => propertyDates.has(date))
      })
      
      setAvailableProperties(filtered)
    } catch (error) {
      console.error("Error loading available properties:", error)
      // Se c'è un errore, mostra tutte le proprietà (fallback)
      setAvailableProperties(properties.map(p => p.id))
    }
  }

  const filteredProperties = properties.filter((p) => {
    // Filtro ricerca base
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.country.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    // Filtro prezzo
    if (minPrice && p.price_per_night < parseFloat(minPrice)) return false
    if (maxPrice && p.price_per_night > parseFloat(maxPrice)) return false

    // Filtro amenities
    if (selectedAmenities.length > 0) {
      const propertyAmenities = (p.amenities || []).map(a => a.toLowerCase())
      const hasAllAmenities = selectedAmenities.every(amenity =>
        propertyAmenities.some(pa => pa.includes(amenity.toLowerCase()))
      )
      if (!hasAllAmenities) return false
    }

    // Filtro disponibilità date
    if (checkIn && checkOut && availableProperties.length > 0) {
      return availableProperties.includes(p.id)
    }

    return true
  })

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
              onClick={() => loadProperties(true)}
              size="icon"
              variant="outline"
              className="shrink-0"
              title="Aggiorna posizioni"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setViewMode("feed")}
              className="shrink-0 md:flex hidden"
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
            overscrollBehavior: 'none',
            touchAction: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <MapComponent
            properties={filteredProperties}
            onPropertySelect={handlePropertySelect}
            center={mapCenter || undefined}
          />
        </div>

        {/* Mobile Feed Switch Button - Small button bottom right */}
        <Button
          onClick={() => setViewMode("feed")}
          className="fixed bottom-24 right-4 z-[90] md:hidden rounded-full h-12 w-12 shadow-2xl shadow-purple-500/30 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-purple-500/50"
          size="icon"
        >
          <List className="h-5 w-5 text-white" />
          <span className="sr-only">Vista Feed</span>
        </Button>
      </div>
    )
  }

  // Feed View
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
  ]

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    )
  }

  const clearFilters = () => {
    setCheckIn("")
    setCheckOut("")
    setMinPrice("")
    setMaxPrice("")
    setSelectedAmenities([])
  }

  const hasActiveFilters = checkIn || checkOut || minPrice || maxPrice || selectedAmenities.length > 0

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Bar - Sticky at top */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
        <div className="container mx-auto p-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Cerca per nome, città o paese..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtri
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center text-xs text-white">
                  {selectedAmenities.length + (checkIn ? 1 : 0) + (checkOut ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0)}
                </span>
              )}
            </Button>
            <Button
              onClick={() => setViewMode("map")}
              variant="outline"
              className="md:flex hidden"
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Mappa
            </Button>
          </div>

          {/* Filtri Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/98 dark:bg-gray-900/98 backdrop-blur-sm rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 space-y-4">
              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Check-in
                  </label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Check-out
                  </label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Price Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Prezzo min
                  </label>
                  <Input
                    type="number"
                    placeholder="€0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Prezzo max
                  </label>
                  <Input
                    type="number"
                    placeholder="€1000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {/* Amenities Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Servizi</label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity)
                    const Icon = amenity === "WiFi" ? Wifi : 
                                 amenity === "Parcheggio" ? Car :
                                 amenity === "Animali ammessi" ? Heart : null
                    return (
                      <Button
                        key={amenity}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAmenity(amenity)}
                        className="rounded-2xl"
                      >
                        {Icon && <Icon className="h-3 w-3 mr-1" />}
                        {amenity}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Rimuovi filtri
                </Button>
              )}
            </div>
          )}
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

      {/* Floating Toggle Button - Mobile only */}
      <Button
        onClick={() => setViewMode("map")}
        className="fixed bottom-24 right-4 z-10 md:hidden rounded-full h-12 w-12 shadow-2xl shadow-purple-500/30 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-purple-500/50"
        size="icon"
      >
        <MapIcon className="h-5 w-5 text-white" />
        <span className="sr-only">Vista Mappa</span>
      </Button>
    </div>
  )
}
