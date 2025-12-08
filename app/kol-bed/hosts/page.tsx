"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { Search, Building2, MapPin, ArrowLeft, User } from "lucide-react"

interface HostProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  properties?: Array<{
    id: string
    name: string
    city: string
    country: string
    images: string[] | null
  }>
}

export default function HostsListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [hosts, setHosts] = useState<HostProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      loadHosts()
    }
  }, [status, session, router])

  const loadHosts = async () => {
    try {
      // Load hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "host")
        .order("created_at", { ascending: false })

      if (hostsError) throw hostsError

      // Load properties for each host
      const hostsWithProperties = await Promise.all(
        (hostsData || []).map(async (host) => {
          const { data: propertiesData } = await supabase
            .from("properties")
            .select("id, name, city, country, images")
            .eq("host_id", host.id)
            .eq("is_active", true)

          return {
            ...host,
            properties: propertiesData || [],
          }
        })
      )

      setHosts(hostsWithProperties)
    } catch (error) {
      console.error("Error loading hosts:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter hosts based on search query (city or country)
  const filteredHosts = hosts.filter((host) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    // Check if any property matches the search query
    return host.properties?.some(
      (property) =>
        property.city?.toLowerCase().includes(query) ||
        property.country?.toLowerCase().includes(query)
    )
  })

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-3xl font-bold mb-2">Host disponibili</h1>
          <p className="text-muted-foreground">
            Esplora gli host e le loro strutture disponibili per collaborazioni
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per città o paese (es. Parigi, Francia)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Hosts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Host ({filteredHosts.length})
          </h2>
          {filteredHosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchQuery
                  ? `Nessun host trovato con strutture in "${searchQuery}"`
                  : "Nessun host trovato"}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHosts.map((host) => {
                // Get unique locations from host's properties
                const locations = Array.from(
                  new Set(
                    host.properties?.map(
                      (p) => `${p.city}, ${p.country}`
                    ) || []
                  )
                )

                return (
                  <Card
                    key={host.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/profile/${host.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                          {host.avatar_url ? (
                            <Image
                              src={host.avatar_url}
                              alt={host.username || host.full_name || "Host"}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {host.full_name || host.username || "Host"}
                          </h3>
                          {host.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              @{host.username}
                            </p>
                          )}
                          {host.bio && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {host.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Properties count and locations */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-semibold">
                            {host.properties?.length || 0} struttura
                            {host.properties?.length !== 1 ? "e" : ""}
                          </span>
                        </div>
                        {locations.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {locations.slice(0, 3).map((location, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>{location}</span>
                              </div>
                            ))}
                            {locations.length > 3 && (
                              <div className="text-xs text-muted-foreground px-2 py-1">
                                +{locations.length - 3} altre
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
