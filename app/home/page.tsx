"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile, UserRole } from "@/types/user"
import Image from "next/image"
import Link from "next/link"
import { Instagram, Youtube, Users, MessageCircle, Euro, Heart, MapPin } from "lucide-react"

interface CreatorProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  social_accounts: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
  }>
  total_followers: number
}

interface HostProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  properties: Array<{
    id: string
    name: string
    price_per_night: number
    images: string[]
  }>
  total_visitors: number
  min_price: number
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [hosts, setHosts] = useState<HostProfile[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadData()
    }
  }, [status, session, router])

  const loadData = async () => {
    if (!session?.user?.id) return

    try {
      // Load user profile to get role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      if (!profileData?.role) {
        router.push("/onboarding")
        return
      }

      // Load data based on role
      switch (profileData.role) {
        case "host":
          await loadCreators()
          break
        case "creator":
          await loadHosts()
          break
        case "manager":
          await loadCreators()
          await loadHosts()
          break
        case "traveler":
          await loadPosts()
          break
        default:
          // No role or other - load posts as default
          await loadPosts()
          break
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCreators = async () => {
    try {
      const { data: creatorsData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          bio,
          social_accounts:social_accounts(platform, username, follower_count, verified)
        `)
        .eq("role", "creator")
        .limit(20)

      if (error) throw error

      const creatorsWithStats = (creatorsData || []).map((creator: any) => {
        const socialAccounts = creator.social_accounts || []
        const totalFollowers = socialAccounts.reduce(
          (sum: number, acc: any) => sum + (acc.follower_count || 0),
          0
        )
        return {
          ...creator,
          social_accounts: socialAccounts,
          total_followers: totalFollowers,
        }
      })

      setCreators(creatorsWithStats)
    } catch (error) {
      console.error("Error loading creators:", error)
    }
  }

  const loadHosts = async () => {
    try {
      const { data: hostsData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          properties:properties!properties_host_id_fkey(id, name, price_per_night, images, is_active)
        `)
        .eq("role", "host")
        .limit(20)

      if (error) throw error

      const hostsWithStats = await Promise.all(
        (hostsData || []).map(async (host: any) => {
          const activeProperties = (host.properties || []).filter((p: any) => p.is_active)
          
          // Get total visitors (bookings count)
          const { count: visitorsCount } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .in(
              "property_id",
              activeProperties.map((p: any) => p.id)
            )
            .eq("status", "confirmed")

          const prices = activeProperties
            .map((p: any) => p.price_per_night)
            .filter((p: number) => p > 0)

          return {
            ...host,
            properties: activeProperties,
            total_visitors: visitorsCount || 0,
            min_price: prices.length > 0 ? Math.min(...prices) : 0,
          }
        })
      )

      setHosts(hostsWithStats.filter((h) => h.properties.length > 0))
    } catch (error) {
      console.error("Error loading hosts:", error)
    }
  }

  const loadPosts = async () => {
    try {
      // First get all host and creator user IDs
      const { data: hostCreatorProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["host", "creator"])

      const hostCreatorIds = hostCreatorProfiles?.map((p) => p.id) || []

      if (hostCreatorIds.length === 0) {
        setPosts([])
        return
      }

      // Load posts from Host and Creator profiles only
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(username, full_name, avatar_url, role)
        `)
        .in("author_id", hostCreatorIds)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      // Check which posts are liked by current user
      if (session?.user?.id && postsData && postsData.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", session.user.id)

        const likedPostIds = new Set(likes?.map((l) => l.post_id) || [])

        const postsWithLikes = postsData.map((post: any) => ({
          ...post,
          liked: likedPostIds.has(post.id),
        }))

        setPosts(postsWithLikes)
      } else {
        setPosts((postsData || []).map((post: any) => ({ ...post, liked: false })))
      }
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!profile || !session) {
    return null
  }

  // Host View - Shows Creators
  if (profile.role === "host") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Creator Disponibili</h1>
          {creators.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nessun creator disponibile al momento</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {creators.map((creator) => (
                <Card
                  key={creator.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/profile/${creator.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                        {creator.avatar_url ? (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.username || "Creator"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-lg">
                              {(creator.username || creator.full_name || "C")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {creator.full_name || creator.username || "Creator"}
                        </h3>
                        {creator.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {creator.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          {creator.total_followers > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="w-4 h-4" />
                              <span>{creator.total_followers.toLocaleString()} follower</span>
                            </div>
                          )}
                        </div>
                        {creator.social_accounts.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {creator.social_accounts.map((account, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                              >
                                {account.platform === "instagram" && (
                                  <Instagram className="w-3 h-3" />
                                )}
                                {account.platform === "youtube" && (
                                  <Youtube className="w-3 h-3" />
                                )}
                                {account.verified && (
                                  <span className="text-blue-500">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Creator View - Shows Hosts
  if (profile.role === "creator") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Host Disponibili</h1>
          {hosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nessun host disponibile al momento</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {hosts.map((host) => (
                <Card
                  key={host.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/profile/${host.id}`)}
                >
                  {host.properties[0]?.images?.[0] && (
                    <div className="relative w-full h-48">
                      <Image
                        src={host.properties[0].images[0]}
                        alt={host.properties[0].name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                        {host.avatar_url ? (
                          <Image
                            src={host.avatar_url}
                            alt={host.username || "Host"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold text-lg">
                              {(host.username || host.full_name || "H")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {host.full_name || host.username || "Host"}
                        </h3>
                        {host.min_price > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Euro className="w-4 h-4" />
                            <span className="font-semibold">{host.min_price}</span>
                            <span className="text-sm text-muted-foreground">/notte</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{host.total_visitors} visitatori</span>
                          <span>{host.properties.length} proprietà</span>
                        </div>
                        <Button
                          className="w-full mt-4"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/profile/${host.id}`)
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contatta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Manager View - Shows both Creators and Hosts
  if (profile.role === "manager") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Home</h1>
            <p className="text-muted-foreground">Collabora con creator e host</p>
          </div>

          {/* Creators Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Creator</h2>
            {creators.length === 0 ? (
              <p className="text-muted-foreground">Nessun creator disponibile</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {creators.map((creator) => (
                  <Card
                    key={creator.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/profile/${creator.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                          {creator.avatar_url ? (
                            <Image
                              src={creator.avatar_url}
                              alt={creator.username || "Creator"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold text-lg">
                                {(creator.username || creator.full_name || "C")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {creator.full_name || creator.username || "Creator"}
                          </h3>
                          {creator.total_followers > 0 && (
                            <div className="flex items-center gap-1 text-sm mt-1">
                              <Users className="w-4 h-4" />
                              <span>{creator.total_followers.toLocaleString()} follower</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Hosts Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Host</h2>
            {hosts.length === 0 ? (
              <p className="text-muted-foreground">Nessun host disponibile</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {hosts.map((host) => (
                  <Card
                    key={host.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/profile/${host.id}`)}
                  >
                    {host.properties[0]?.images?.[0] && (
                      <div className="relative w-full h-48">
                        <Image
                          src={host.properties[0].images[0]}
                          alt={host.properties[0].name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
                          {host.avatar_url ? (
                            <Image
                              src={host.avatar_url}
                              alt={host.username || "Host"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold text-lg">
                                {(host.username || host.full_name || "H")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {host.full_name || host.username || "Host"}
                          </h3>
                          {host.min_price > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Euro className="w-4 h-4" />
                              <span className="font-semibold">{host.min_price}</span>
                              <span className="text-sm text-muted-foreground">/notte</span>
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground mt-1">
                            {host.properties.length} proprietà
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Traveler View - Shows Posts from Hosts and Creators
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Home</h1>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun post disponibile al momento</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                      {post.author?.avatar_url ? (
                        <Image
                          src={post.author.avatar_url}
                          alt={post.author.username || "User"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {(post.author?.username || post.author?.full_name || "U")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {post.author?.full_name || post.author?.username || "Utente"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                  
                  <p className="mb-4">{post.content}</p>
                  
                  {post.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{post.location}</span>
                    </div>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {post.images.slice(0, 4).map((img: string, idx: number) => (
                        <div key={idx} className="relative w-full h-48 rounded-lg overflow-hidden">
                          <Image
                            src={img}
                            alt={`Post image ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {post.property_id && (
                    <Button asChild variant="outline" className="w-full mb-4">
                      <Link href={`/properties/${post.property_id}`}>
                        Vedi proprietà →
                      </Link>
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement like functionality
                      }}
                    >
                      <Heart
                        className={`w-5 h-5 mr-2 ${post.liked ? "fill-red-500 text-red-500" : ""}`}
                      />
                      {post.like_count || 0}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {post.comment_count || 0}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

