"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { 
  Settings, 
  Grid3x3, 
  Square, 
  Users, 
  Share2, 
  Heart,
  MessageCircle,
  Link2,
  Copy,
  Check
} from "lucide-react"
import Link from "next/link"

interface Post {
  id: string
  images: string[]
  content: string
  like_count: number
  comment_count: number
  created_at: string
}

interface Property {
  id: string
  name: string
  images: string[]
  city: string
  country: string
}

interface Collaboration {
  id: string
  property_id: string
  property: Property
  status: string
  collaboration_type: string
}

type TabType = "posts" | "vetrina" | "collab"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("posts")
  
  // Statistics
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    postsCount: 0,
    propertiesCount: 0,
  })
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [shareLinkCopied, setShareLinkCopied] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated" && session?.user?.id) {
      loadData()
    }
  }, [status, session, router])

  const loadData = async () => {
    if (!session?.user?.id) return

    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setFullName(profileData.full_name || "")
      setUsername(profileData.username || "")
      setBio(profileData.bio || "")
      setAvatarUrl(profileData.avatar_url || "")

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", session.user.id)
        .order("created_at", { ascending: false })

      if (postsError) throw postsError
      setPosts(postsData || [])

      // Load properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id, name, images, city, country")
        .eq("host_id", session.user.id)
        .eq("is_active", true)

      if (propertiesError) throw propertiesError
      setProperties(propertiesData || [])

      // Load collaborations (accepted/completed where host sponsors)
      const { data: collabsData, error: collabsError } = await supabase
        .from("collaborations")
        .select(`
          id,
          property_id,
          status,
          collaboration_type,
          property:properties(id, name, images, city, country)
        `)
        .eq("host_id", session.user.id)
        .in("status", ["accepted", "completed"])

      if (collabsError) throw collabsError
      
      // Map collaborations to correct type structure
      const mappedCollaborations: Collaboration[] = (collabsData || [])
        .filter((c: any) => c.property)
        .map((c: any) => {
          const property = Array.isArray(c.property) ? c.property[0] : c.property
          return {
            id: c.id,
            property_id: c.property_id,
            status: c.status,
            collaboration_type: c.collaboration_type,
            property: {
              id: property.id,
              name: property.name,
              images: property.images || [],
              city: property.city,
              country: property.country,
            },
          }
        })
        .filter((c: Collaboration) => c.property && c.property.id)
      
      setCollaborations(mappedCollaborations)

      // Load statistics
      await loadStatistics()
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare il profilo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    if (!session?.user?.id) return

    try {
      // Followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", session.user.id)

      // Following count
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", session.user.id)

      // Posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", session.user.id)

      // Properties count
      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("host_id", session.user.id)
        .eq("is_active", true)

      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        postsCount: postsCount || 0,
        propertiesCount: propertiesCount || 0,
      })
    } catch (error) {
      console.error("Error loading statistics:", error)
    }
  }

  const handleSave = async () => {
    if (!session?.user?.id) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Profilo aggiornato con successo!",
      })

      setIsEditing(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleShareProperty = async (propertyId: string) => {
    const shareUrl = `${window.location.origin}/properties/${propertyId}?ref=${session?.user?.id}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkCopied(true)
      toast({
        title: "Link copiato!",
        description: "Condividi questo link per ricevere il 10% sulle prenotazioni",
      })
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      })
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div>Profilo non trovato</div>
      </div>
    )
  }

  // Only show Instagram-style profile for Host role
  if (profile.role !== "host") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-4xl">
          <h1 className="text-2xl font-bold mb-4">Il tuo profilo</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                La vista Instagram-style è disponibile solo per gli Host.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header - Instagram Style */}
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex justify-center md:justify-start">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-foreground">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username || "Profile"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl md:text-4xl font-bold text-primary">
                      {(username || fullName || "H")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h1 className="text-xl md:text-2xl font-light">
                  {username || "username"}
                </h1>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm"
                  >
                    {isEditing ? "Annulla" : "Modifica profilo"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/host")}
                    className="text-sm"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Statistics */}
              <div className="flex gap-6 mb-4">
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.postsCount}</span>
                  <span className="text-muted-foreground ml-1">post</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.followers}</span>
                  <span className="text-muted-foreground ml-1">follower</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.following}</span>
                  <span className="text-muted-foreground ml-1">following</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.propertiesCount}</span>
                  <span className="text-muted-foreground ml-1">property</span>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="mt-1"
                        placeholder="Racconta qualcosa di te..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar">Avatar URL</Label>
                      <Input
                        id="avatar"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="mt-1"
                        placeholder="https://..."
                      />
                    </div>
                    <Button onClick={handleSave} className="w-full">
                      Salva modifiche
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold">{fullName}</p>
                    {bio && <p className="text-sm mt-1 whitespace-pre-line">{bio}</p>}
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/properties?host=${session?.user?.id}`
                          navigator.clipboard.writeText(url)
                          toast({
                            title: "Link copiato!",
                            description: "Condividi questo link per promuovere le tue strutture",
                          })
                        }}
                        className="text-xs"
                      >
                        <Link2 className="w-3 h-3 mr-1" />
                        Condividi strutture
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-b">
          <div className="flex justify-center">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "posts"
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Post
              </div>
            </button>
            <button
              onClick={() => setActiveTab("vetrina")}
              className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "vetrina"
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Square className="w-4 h-4" />
                Vetrina
              </div>
            </button>
            <button
              onClick={() => setActiveTab("collab")}
              className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "collab"
                  ? "border-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Collab
              </div>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-4">
          {activeTab === "posts" && (
            <div>
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nessun post pubblicato</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {post.images && post.images.length > 0 ? (
                        <>
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart className="w-5 h-5 fill-white" />
                              <span className="font-semibold">{post.like_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white">
                              <MessageCircle className="w-5 h-5" />
                              <span className="font-semibold">{post.comment_count || 0}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">
                            {post.content?.substring(0, 50)}...
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "vetrina" && (
            <div>
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Nessuna struttura disponibile</p>
                  <Button asChild>
                    <Link href="/dashboard/host/properties/new">
                      Aggiungi struttura
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {property.images && property.images.length > 0 ? (
                        <>
                          <Link href={`/properties/${property.id}`}>
                            <Image
                              src={property.images[0]}
                              alt={property.name}
                              fill
                              className="object-cover"
                            />
                          </Link>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShareProperty(property.id)}
                              className="text-white hover:text-white hover:bg-white/20"
                            >
                              {shareLinkCopied ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Copiato!
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Condividi
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Link href={`/properties/${property.id}`}>
                          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                            <span className="text-muted-foreground text-sm text-center">
                              {property.name}
                            </span>
                          </div>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "collab" && (
            <div>
              {collaborations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nessuna collaborazione attiva. Le strutture sponsorizzate appariranno qui.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Riceverai il 10% su ogni prenotazione proveniente dai tuoi link di condivisione.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {collaborations.map((collab) => (
                    <Link
                      key={collab.id}
                      href={`/properties/${collab.property_id}`}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {collab.property.images && collab.property.images.length > 0 ? (
                        <>
                          <Image
                            src={collab.property.images[0]}
                            alt={collab.property.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-sm font-semibold">
                              {collab.property.name}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm text-center p-4">
                            {collab.property.name}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
