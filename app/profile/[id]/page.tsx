"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { Instagram, Youtube, Users, MessageCircle, Euro, MapPin, Home, Mail } from "lucide-react"

interface PublicProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  social_accounts?: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
  }>
  properties?: Array<{
    id: string
    name: string
    city: string
    country: string
    price_per_night: number
    images: string[]
    rating: number
    review_count: number
  }>
  total_followers?: number
  total_visitors?: number
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadProfile(params.id as string)
    }
  }, [params.id])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error

      if (data.role === "creator") {
        // Load social accounts for creators
        const { data: socialData } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", userId)

        const totalFollowers = (socialData || []).reduce(
          (sum, acc) => sum + (acc.follower_count || 0),
          0
        )

        setProfile({
          ...data,
          social_accounts: socialData || [],
          total_followers: totalFollowers,
        })
      } else if (data.role === "host") {
        // Load properties for hosts
        const { data: propertiesData } = await supabase
          .from("properties")
          .select("*")
          .eq("owner_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        // Get total visitors
        const propertyIds = (propertiesData || []).map((p) => p.id)
        let totalVisitors = 0
        if (propertyIds.length > 0) {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .in("property_id", propertyIds)
            .eq("status", "confirmed")
          totalVisitors = count || 0
        }

        setProfile({
          ...data,
          properties: propertiesData || [],
          total_visitors: totalVisitors,
        })
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento profilo...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Profilo non trovato</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0 mx-auto md:mx-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username || profile.full_name || "Profile"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-3xl">
                      {(profile.username || profile.full_name || "U")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {profile.full_name || profile.username || "Utente"}
                </h1>
                {profile.username && (
                  <p className="text-muted-foreground mb-2">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {profile.role === "creator" && profile.total_followers !== undefined && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">{profile.total_followers.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">follower</span>
                    </div>
                  )}
                  {profile.role === "host" && profile.total_visitors !== undefined && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">{profile.total_visitors}</span>
                      <span className="text-sm text-muted-foreground">visitatori</span>
                    </div>
                  )}
                </div>
                {session && session.user.id !== profile.id && (
                  <Button
                    className="mt-4 w-full md:w-auto"
                    onClick={() => {
                      // TODO: Implement messaging
                      router.push(`/profile/${profile.id}`)
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Invia messaggio
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Accounts (for Creators) */}
        {profile.role === "creator" && profile.social_accounts && profile.social_accounts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Piattaforme Social</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {profile.social_accounts.map((account, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {account.platform === "instagram" && (
                      <Instagram className="w-6 h-6 text-pink-500" />
                    )}
                    {account.platform === "youtube" && (
                      <Youtube className="w-6 h-6 text-red-500" />
                    )}
                    {account.platform === "tiktok" && (
                      <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">TT</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">@{account.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.follower_count.toLocaleString()} follower
                      </p>
                    </div>
                    {account.verified && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Properties (for Hosts) */}
        {profile.role === "host" && profile.properties && profile.properties.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Strutture</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {profile.properties.map((property) => (
                <Card
                  key={property.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/properties/${property.id}`)}
                >
                  {property.images && property.images.length > 0 && (
                    <div className="relative w-full h-48">
                      <Image
                        src={property.images[0]}
                        alt={property.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {property.city}, {property.country}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">
                        €{property.price_per_night}
                        <span className="text-sm font-normal text-muted-foreground">/notte</span>
                      </span>
                      {property.rating > 0 && (
                        <span className="text-sm">
                          ⭐ {property.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

