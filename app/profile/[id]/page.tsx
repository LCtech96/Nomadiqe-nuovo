"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { Instagram, Youtube, Users, MessageCircle, Euro, MapPin, Home, Mail, UserPlus, UserCheck, Share2, Check } from "lucide-react"
import SendMessageDialog from "@/components/send-message-dialog"
import { useToast } from "@/hooks/use-toast"

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
  points?: number
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followingLoading, setFollowingLoading] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState<string | null>(null)
  const { toast } = useToast()

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

      // Verifica se l'utente corrente sta seguendo questo profilo
      if (session?.user?.id && session.user.id !== userId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", session.user.id)
          .eq("following_id", userId)
          .maybeSingle()
        
        setIsFollowing(!!followData)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!session?.user?.id || !profile) return

    setFollowingLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", session.user.id)
          .eq("following_id", profile.id)

        if (error) throw error
        setIsFollowing(false)
        toast({
          title: "Hai smesso di seguire",
          description: `Non segui più ${profile.username || profile.full_name || "questo utente"}`,
        })
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: session.user.id,
            following_id: profile.id,
          })

        if (error) throw error
        setIsFollowing(true)
        toast({
          title: "Ora segui questo utente",
          description: `Stai seguendo ${profile.username || profile.full_name || "questo utente"}`,
        })
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile seguire/non seguire questo utente",
        variant: "destructive",
      })
    } finally {
      setFollowingLoading(false)
    }
  }

  const handleShareProperty = async (propertyId: string) => {
    const shareUrl = `${window.location.origin}/properties/${propertyId}?ref=${session?.user?.id || ''}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkCopied(propertyId)
      toast({
        title: "Link copiato!",
        description: "Condividi questo link per promuovere la struttura",
      })
      setTimeout(() => setShareLinkCopied(null), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      })
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
              <div className="relative mx-auto md:mx-0">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username || profile.full_name || "Profile"}
                      fill
                      sizes="(max-width: 768px) 96px, 128px"
                      priority
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
                {/* Points Badge */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-background">
                  ⭐ {profile.points || 0}
                </div>
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
                  <div className="flex items-center gap-1">
                    <span className="text-lg">⭐</span>
                    <span className="font-semibold text-primary">{profile.points || 0}</span>
                    <span className="text-sm text-muted-foreground">punti</span>
                  </div>
                </div>
                {session && session.user.id !== profile.id && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      className="flex-1 md:flex-none"
                      onClick={handleFollow}
                      disabled={followingLoading}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Segui già
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Segui
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none"
                      onClick={() => setShowMessageDialog(true)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Messaggio
                    </Button>
                  </div>
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
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {property.images && property.images.length > 0 ? (
                    <div className="relative w-full h-48 group cursor-pointer" onClick={() => router.push(`/properties/${property.id}`)}>
                      <Image
                        src={property.images[0]}
                        alt={property.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleShareProperty(property.id)
                          }}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          {shareLinkCopied === property.id ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Copiato!
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4 mr-2" />
                              Condividi struttura
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-48 cursor-pointer" onClick={() => router.push(`/properties/${property.id}`)}>
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Home className="w-12 h-12 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 
                      className="font-semibold text-lg mb-1 cursor-pointer hover:underline"
                      onClick={() => router.push(`/properties/${property.id}`)}
                    >
                      {property.name}
                    </h3>
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

      {/* Message Dialog */}
      {profile && (
        <SendMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          receiverId={profile.id}
          receiverName={profile.username || profile.full_name || "Utente"}
          receiverRole={profile.role || undefined}
        />
      )}
    </div>
  )
}

