"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { 
  Instagram, 
  Youtube, 
  Users, 
  MessageCircle, 
  MapPin, 
  Home, 
  UserPlus, 
  UserCheck, 
  Share2, 
  Check, 
  ArrowLeft,
  Eye,
  ThumbsUp,
  Heart,
  Facebook,
  TrendingUp,
  PieChart,
  BarChart3,
  Globe,
  Briefcase,
  Calendar,
  Edit
} from "lucide-react"
import SendMessageDialog from "@/components/send-message-dialog"
import SupplierCatalogDialog from "@/components/supplier-catalog-dialog"
import HostAvailabilityCalendar from "@/components/host-availability-calendar"
import { useToast } from "@/hooks/use-toast"

interface Post {
  id: string
  images: string[] | null
  content: string | null
  likes_count: number
  created_at: string
}

interface Property {
  id: string
  title: string
  name: string
  images: string[] | null
  location_data: any
  city?: string
  country?: string
  price_per_night?: number
  rating?: number
}

interface Collaboration {
  id: string
  property_id: string
  property: Property
  status: string
}

interface Stats {
  followers: number
  following: number
  postsCount: number
  profileViews?: number
  totalInteractions?: number
}

interface JollyService {
  id: string
  service_type: string
  title: string
  description: string | null
  price_per_hour: number | null
  price_per_service: number | null
  percentage_commission: number | null
  price_per_route: Record<string, number> | null
  vehicle_type: string | null
}

interface PublicProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
  host_level?: string | null
  creator_level?: string | null
  social_accounts?: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
    engagement_rate?: number
  }>
  properties?: Property[]
  posts?: Post[]
  collaborations?: Collaboration[]
  services?: JollyService[]
  stats?: Stats
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
  const [showCatalogDialog, setShowCatalogDialog] = useState(false)
  const [selectedSupplierService, setSelectedSupplierService] = useState<string | null>(null)
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [kolBedPreferences, setKolBedPreferences] = useState<any>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [interactionBlocked, setInteractionBlocked] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [stats, setStats] = useState<Stats>({
    followers: 0,
    following: 0,
    postsCount: 0,
    profileViews: 0,
    totalInteractions: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    if (params.id) {
      loadProfile(params.id as string)
    }
  }, [params.id])

  // Gestisci interazioni per utenti non autenticati
  useEffect(() => {
    const isUnauthenticated = !session || !session.user

    if (isUnauthenticated && profile && !loading) {
      let initialScrollY = window.scrollY
      let scrollThreshold = 50 // Permetti scroll fino a 50px prima di bloccare

      const handleScroll = () => {
        const currentScrollY = window.scrollY
        const scrollDelta = Math.abs(currentScrollY - initialScrollY)

        if (scrollDelta > scrollThreshold && !hasInteracted) {
          setHasInteracted(true)
          setShowAuthDialog(true)
          setInteractionBlocked(true)
          // Blocca lo scroll
          document.body.style.overflow = "hidden"
          window.scrollTo(0, initialScrollY) // Torna alla posizione iniziale
        }
      }

      // Blocca click su elementi interattivi
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // Permetti click solo su elementi non interattivi (immagini, testo)
        if (
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest('[role="button"]') ||
          target.closest(".cursor-pointer") ||
          target.closest('[onclick]')
        ) {
          e.preventDefault()
          e.stopPropagation()
          if (!hasInteracted) {
            setHasInteracted(true)
            setShowAuthDialog(true)
            setInteractionBlocked(true)
            document.body.style.overflow = "hidden"
          }
        }
      }

      // Blocca anche i tab (navigazione da tastiera)
      const handleTab = (e: KeyboardEvent) => {
        if (e.key === "Tab" && !hasInteracted) {
          e.preventDefault()
          setHasInteracted(true)
          setShowAuthDialog(true)
          setInteractionBlocked(true)
          document.body.style.overflow = "hidden"
        }
      }

      // Aggiungi listener con piccolo delay per permettere la visualizzazione iniziale
      const timeoutId = setTimeout(() => {
        window.addEventListener("scroll", handleScroll, { passive: true })
        document.addEventListener("click", handleClick, true)
        document.addEventListener("keydown", handleTab, true)
      }, 1000) // 1 secondo di delay per permettere la visualizzazione

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener("scroll", handleScroll)
        document.removeEventListener("click", handleClick, true)
        document.removeEventListener("keydown", handleTab, true)
        document.body.style.overflow = ""
      }
    } else {
      // Se autenticato, rimuovi blocchi
      setInteractionBlocked(false)
      setHasInteracted(false)
      document.body.style.overflow = ""
    }
  }, [session, profile, loading, hasInteracted])

  const trackProfileView = async (profileId: string) => {
    if (!session?.user?.id || session.user.id === profileId) return
    
    try {
      // Registra una view del profilo
      await supabase
        .from("profile_views")
        .insert({
          profile_id: profileId,
          viewer_id: session.user.id
        })
    } catch (error) {
      console.error("Error tracking profile view:", error)
    }
  }

  // Helper function to check if string is a UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const loadProfile = async (identifier: string) => {
    try {
      setLoading(true)
      
      // Try to load by ID first if it looks like a UUID, otherwise try username
      let data = null
      let error = null

      if (isUUID(identifier)) {
        // It's a UUID, search by ID
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", identifier)
          .maybeSingle()
        
        data = result.data
        error = result.error
      } else {
        // It's likely a username, search by username
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("username", identifier.toLowerCase().trim())
          .maybeSingle()
        
        data = result.data
        error = result.error
      }

      // If not found by username and it's not a UUID, try by ID as fallback
      if (!data && !isUUID(identifier)) {
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", identifier)
          .maybeSingle()
        
        data = result.data
        error = result.error
      }

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (!data) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Use the actual profile ID for all subsequent queries
      const profileId = data.id

      // Track profile view (only if user is logged in and viewing someone else's profile)
      if (session?.user?.id && session.user.id !== profileId) {
        trackProfileView(profileId)
      }

      // Load stats
      await loadStats(profileId)

      // Load posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", profileId)
        .order("created_at", { ascending: false })

      if (data.role === "creator") {
        // Load social accounts for creators
        const { data: socialData } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", profileId)

        // Load collaborations (solo quelle visibili)
        const { data: collabsData } = await supabase
          .from("collaborations")
          .select(`
            id,
            property_id,
            status,
            property:properties(id, title, images, location_data)
          `)
          .eq("creator_id", profileId)
          .eq("is_visible", true)
          .in("status", ["approved", "completed"])

        const mappedCollaborations = (collabsData || [])
          .filter((c: any) => c.property)
          .map((c: any) => {
            const property = Array.isArray(c.property) ? c.property[0] : c.property
            return {
              id: c.id,
              property_id: c.property_id,
              status: c.status,
              property: property,
            }
          })

        setProfile({
          ...data,
          social_accounts: socialData || [],
          posts: postsData || [],
          collaborations: mappedCollaborations,
        })
      } else if (data.role === "host") {
        // Load properties for hosts
        const { data: propertiesData } = await supabase
          .from("properties")
          .select("*")
          .eq("owner_id", profileId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        // Load collaborations where host sponsors
        const { data: collabsData } = await supabase
          .from("collaborations")
          .select(`
            id,
            property_id,
            status,
            property:properties(id, title, images, location_data)
          `)
          .eq("host_id", profileId)
          .in("status", ["approved", "completed"])

        const mappedCollaborations = (collabsData || [])
          .filter((c: any) => c.property)
          .map((c: any) => {
            const property = Array.isArray(c.property) ? c.property[0] : c.property
            return {
              id: c.id,
              property_id: c.property_id,
              status: c.status,
              property: property,
            }
          })

        // Load KOL&BED preferences
        const { data: prefsData } = await supabase
          .from("host_kol_bed_preferences")
          .select("*")
          .eq("host_id", profileId)
          .maybeSingle()

        setProfile({
          ...data,
          properties: propertiesData || [],
          posts: postsData || [],
          collaborations: mappedCollaborations,
        })
        
        if (prefsData) {
          setKolBedPreferences(prefsData)
        }
      } else if (data.role === "jolly") {
        // Load services for jolly
        const { data: servicesData } = await supabase
          .from("manager_services")
          .select("*")
          .eq("manager_id", profileId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        setProfile({
          ...data,
          posts: postsData || [],
          services: servicesData || [],
        })
      } else {
        setProfile({
          ...data,
          posts: postsData || [],
        })
      }

      // Check if following
      if (session?.user?.id && session.user.id !== profileId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", session.user.id)
          .eq("following_id", profileId)
          .maybeSingle()
        
        setIsFollowing(!!followData)
      }
      
      // Load stats using profileId
      await loadStats(profileId)
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (userId: string) => {
    try {
      // Carica statistiche manuali se disponibili (per creator)
      const { data: manualAnalytics } = await supabase
        .from("creator_manual_analytics")
        .select("*")
        .eq("creator_id", userId)
        .maybeSingle()

      // Carica statistiche automatiche come fallback
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId)

      const { count: viewsCount } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)

      const { data: userPosts } = await supabase
        .from("posts")
        .select("id, likes_count, comments_count")
        .eq("author_id", userId)

      const totalInteractions = (userPosts || []).reduce(
        (sum, post) => sum + (post.likes_count || 0) + (post.comments_count || 0),
        0
      )

      // Usa statistiche manuali se disponibili e se i flag di visibilità lo permettono
      // Altrimenti usa le statistiche automatiche
      setStats({
        followers: manualAnalytics?.show_followers && manualAnalytics.total_followers !== null
          ? manualAnalytics.total_followers
          : (followersCount || 0),
        following: manualAnalytics?.show_following && manualAnalytics.total_following !== null
          ? manualAnalytics.total_following
          : (followingCount || 0),
        postsCount: manualAnalytics?.show_posts && manualAnalytics.total_posts !== null
          ? manualAnalytics.total_posts
          : (postsCount || 0),
        profileViews: manualAnalytics?.show_profile_views && manualAnalytics.profile_views !== null
          ? manualAnalytics.profile_views
          : (viewsCount || 0),
        totalInteractions: manualAnalytics?.show_interactions && manualAnalytics.total_interactions !== null
          ? manualAnalytics.total_interactions
          : totalInteractions,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
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
        
        // Update local stats
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
        
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
        
        // Update local stats
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }))

        // Create notification for the followed user
        const { data: followerProfile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", session.user.id)
          .single()

        const followerName = followerProfile?.username || followerProfile?.full_name || "Un utente"

        await supabase
          .from("notifications")
          .insert({
            user_id: profile.id,
            type: "new_follower",
            title: "Nuovo follower",
            message: `${followerName} ha iniziato a seguirti`,
            related_id: session.user.id,
          })

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

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "host":
        return "bg-blue-500"
      case "creator":
        return "bg-purple-500"
      case "traveler":
        return "bg-green-500"
      case "jolly":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
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
    <div className="min-h-screen bg-background pb-20 relative">
      {/* Overlay per bloccare interazioni quando non autenticato */}
      {!session && interactionBlocked && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowAuthDialog(true)}
        />
      )}

      {/* Dialog per richiedere registrazione/login */}
      <Dialog open={showAuthDialog} onOpenChange={(open) => {
        setShowAuthDialog(open)
        if (!open && !session) {
          // Se chiude il dialog senza autenticarsi, riabilita il blocco dopo un po'
          setTimeout(() => {
            setInteractionBlocked(true)
            document.body.style.overflow = "hidden"
          }, 100)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Registrati o Accedi</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Per interagire con questo profilo, vedere tutti i contenuti e accedere alle funzionalità complete, 
              devi essere registrato. Crea un account gratuito o accedi se ne hai già uno.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAuthDialog(false)
                router.push("/auth/signup")
              }}
              className="w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Registrati Gratis
            </Button>
            <Button
              onClick={() => {
                setShowAuthDialog(false)
                router.push("/auth/signin")
              }}
              className="w-full sm:w-auto"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Accedi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back Button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </Button>
        </div>
        
        {/* Banner per utenti non autenticati */}
        {!session && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 text-center">
            <p className="text-sm font-medium">
              👀 Stai visualizzando questo profilo come ospite. 
              <Button
                variant="link"
                className="text-white underline p-0 ml-1 h-auto font-bold"
                onClick={() => setShowAuthDialog(true)}
              >
                Registrati o accedi
              </Button>
              {" "}per interagire e vedere tutti i contenuti!
            </p>
          </div>
        )}
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative mx-auto md:mx-0">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0 border-4 border-primary/20">
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
                {/* Role Badge */}
                {profile.role && (
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${getRoleBadgeColor(profile.role)} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-background uppercase`}>
                    {profile.role}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {profile.full_name || profile.username || "Utente"}
                  </h1>
                  {profile.role === "host" && profile.host_level && (
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                      profile.host_level === "Base" ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200" :
                      profile.host_level === "Advanced" ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" :
                      profile.host_level === "Rubino" ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200" :
                      profile.host_level === "Zaffiro" ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200" :
                      profile.host_level === "Prime" ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}>
                      {profile.host_level}
                    </span>
                  )}
                  {profile.role === "creator" && profile.creator_level && (
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                      profile.creator_level === "Starter" ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200" :
                      profile.creator_level === "Rising" ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200" :
                      profile.creator_level === "Influencer" ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200" :
                      profile.creator_level === "Elite" ? "bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200" :
                      profile.creator_level === "Icon" ? "bg-gradient-to-r from-yellow-200 to-orange-200 dark:from-yellow-800 dark:to-orange-800 text-yellow-900 dark:text-yellow-100" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}>
                      {profile.creator_level}
                    </span>
                  )}
                </div>
                {profile.username && (
                  <p className="text-muted-foreground mb-2">@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                
                {/* Stats */}
                <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-4">
                  <div className="text-center">
                    <span className="font-bold text-lg block">{stats.postsCount}</span>
                    <span className="text-sm text-muted-foreground">post</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg block">{stats.followers}</span>
                    <span className="text-sm text-muted-foreground">follower</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg block">{stats.following}</span>
                    <span className="text-sm text-muted-foreground">following</span>
                  </div>
                </div>

                {session?.user?.id && session.user.id !== profile.id && (
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
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        setShowMessageDialog(true)
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Messaggio
                    </Button>
                  </div>
                )}
                
                {/* Messaggio per utenti non autenticati */}
                {!session && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                      👆 <strong>Registrati o accedi</strong> per interagire con questo profilo e vedere tutti i contenuti
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HOST PROFILE */}
        {profile.role === "host" && (
          <Tabs defaultValue="strutture" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="strutture">Strutture</TabsTrigger>
              <TabsTrigger value="collaborazioni">Collaborazioni</TabsTrigger>
              <TabsTrigger value="post">Post</TabsTrigger>
            </TabsList>

            <TabsContent value="strutture" className="mt-6">
              {profile.properties && profile.properties.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {profile.properties.map((property) => (
                    <div
                      key={property.id}
                      className="relative aspect-square group cursor-pointer"
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        router.push(`/properties/${property.id}`)
                      }}
                    >
                      {property.images && property.images.length > 0 ? (
                        <Image
                          src={property.images[0]}
                          alt={property.title || property.name}
                          fill
                          sizes="(max-width: 768px) 33vw, 200px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Home className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <p className="text-white text-sm font-semibold px-2 text-center">
                          {property.title || property.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna struttura pubblicata</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="collaborazioni" className="mt-6 space-y-6">
              {/* Impostazioni KOL&BED */}
              {kolBedPreferences && (
                <Card>
                  <CardHeader>
                    <CardTitle>Impostazioni KOL&BED</CardTitle>
                    <CardDescription>
                      Informazioni sulle collaborazioni che questo host offre
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kolBedPreferences.nights_per_collaboration > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="font-medium">Notti per collaborazione FREE STAY:</span>
                        <Badge variant="default" className="text-lg">
                          {kolBedPreferences.nights_per_collaboration}
                        </Badge>
                      </div>
                    )}

                    {(kolBedPreferences.required_videos > 0 || 
                      kolBedPreferences.required_posts > 0 || 
                      kolBedPreferences.required_stories > 0) && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-medium mb-2">Contenuti richiesti:</p>
                        <div className="flex gap-4">
                          {kolBedPreferences.required_videos > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_videos}
                              </p>
                              <p className="text-xs text-muted-foreground">Video</p>
                            </div>
                          )}
                          {kolBedPreferences.required_posts > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_posts}
                              </p>
                              <p className="text-xs text-muted-foreground">Post</p>
                            </div>
                          )}
                          {kolBedPreferences.required_stories > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {kolBedPreferences.required_stories}
                              </p>
                              <p className="text-xs text-muted-foreground">Storie</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {kolBedPreferences.kol_bed_months && kolBedPreferences.kol_bed_months.length > 0 && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="font-medium mb-2">Mesi disponibili:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { num: 1, name: "Gen" },
                            { num: 2, name: "Feb" },
                            { num: 3, name: "Mar" },
                            { num: 4, name: "Apr" },
                            { num: 5, name: "Mag" },
                            { num: 6, name: "Giu" },
                            { num: 7, name: "Lug" },
                            { num: 8, name: "Ago" },
                            { num: 9, name: "Set" },
                            { num: 10, name: "Ott" },
                            { num: 11, name: "Nov" },
                            { num: 12, name: "Dic" },
                          ].map((month) => (
                            <Badge
                              key={month.num}
                              variant={kolBedPreferences.kol_bed_months.includes(month.num) ? "default" : "outline"}
                            >
                              {month.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pulsante per vedere il calendario */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        setShowAvailabilityCalendar(true)
                      }}
                      className="w-full"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Visualizza calendario disponibilità
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Calendario disponibilità */}
              {showAvailabilityCalendar && profile.id && (
                <HostAvailabilityCalendar
                  hostId={profile.id}
                  onClose={() => setShowAvailabilityCalendar(false)}
                />
              )}

              {/* Collaborazioni attive */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Collaborazioni attive</h3>
                {profile.collaborations && profile.collaborations.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {profile.collaborations.map((collab) => (
                      <div
                        key={collab.id}
                        className="relative aspect-square group cursor-pointer"
                        onClick={() => {
                          if (!session?.user?.id) {
                            setShowAuthDialog(true)
                            return
                          }
                          router.push(`/properties/${collab.property_id}`)
                        }}
                      >
                        {collab.property.images && collab.property.images.length > 0 ? (
                          <Image
                            src={collab.property.images[0]}
                            alt={collab.property.title || collab.property.name}
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <p className="text-white text-sm font-semibold px-2 text-center">
                            {collab.property.title || collab.property.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nessuna collaborazione attiva</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="post" className="mt-6">
              {profile.posts && profile.posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {profile.posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        router.push(`/posts/${post.id}`)
                      }}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {post.images && post.images.length > 0 ? (
                        <>
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart className="w-5 h-5 fill-white" />
                              <span className="font-semibold">{post.likes_count || 0}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                          <span className="text-muted-foreground text-xs text-center line-clamp-3">
                            {post.content}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nessun post pubblicato</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* CREATOR PROFILE */}
        {profile.role === "creator" && (
          <Tabs defaultValue="statistiche" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="statistiche">Statistiche</TabsTrigger>
              <TabsTrigger value="collaborazioni">Collaborazioni</TabsTrigger>
              <TabsTrigger value="post">Post</TabsTrigger>
            </TabsList>

            <TabsContent value="statistiche" className="mt-6 space-y-6">
              {/* Profile Stats */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Statistiche Profilo
                    </CardTitle>
                    {session?.user?.id === profile.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/creator/settings?tab=analytics")}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <Eye className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats.profileViews || 0}</p>
                      <p className="text-sm text-muted-foreground">Views Profilo</p>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats.totalInteractions || 0}</p>
                      <p className="text-sm text-muted-foreground">Interazioni</p>
                    </div>
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">
                        {stats.totalInteractions && stats.profileViews 
                          ? ((stats.totalInteractions / Math.max(stats.profileViews, 1)) * 100).toFixed(1) 
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media Stats */}
              {profile.social_accounts && profile.social_accounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Social Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile.social_accounts.map((account, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
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
                            {account.platform === "facebook" && (
                              <Facebook className="w-6 h-6 text-blue-600" />
                            )}
                            <div>
                              <p className="font-semibold">@{account.username}</p>
                              <p className="text-sm text-muted-foreground capitalize">{account.platform}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{account.follower_count.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">follower</p>
                            {account.engagement_rate && (
                              <p className="text-xs text-primary mt-1">
                                {account.engagement_rate.toFixed(2)}% engagement
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Engagement Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance
                  </CardTitle>
                  <CardDescription>
                    Statistiche basate sull'attività su Nomadiqe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Engagement Rate</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.totalInteractions && stats.profileViews 
                            ? ((stats.totalInteractions / Math.max(stats.profileViews, 1)) * 100).toFixed(1) 
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all"
                          style={{ 
                            width: `${Math.min(
                              stats.totalInteractions && stats.profileViews 
                                ? (stats.totalInteractions / Math.max(stats.profileViews, 1)) * 100 
                                : 0, 
                              100
                            )}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Reach</span>
                        <span className="text-sm text-muted-foreground">{stats.profileViews || 0} views</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full transition-all"
                          style={{ width: `${Math.min((stats.profileViews || 0) / 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="collaborazioni" className="mt-6">
              {profile.collaborations && profile.collaborations.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {profile.collaborations.map((collab) => (
                    <div
                      key={collab.id}
                      className="relative aspect-square group cursor-pointer"
                      onClick={() => router.push(`/properties/${collab.property_id}`)}
                    >
                      {collab.property.images && collab.property.images.length > 0 ? (
                        <Image
                          src={collab.property.images[0]}
                          alt={collab.property.title || collab.property.name}
                          fill
                          sizes="(max-width: 768px) 33vw, 200px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <p className="text-white text-sm font-semibold px-2 text-center">
                          {collab.property.title || collab.property.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna collaborazione attiva</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="post" className="mt-6">
              {profile.posts && profile.posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {profile.posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        router.push(`/posts/${post.id}`)
                      }}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {post.images && post.images.length > 0 ? (
                        <>
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart className="w-5 h-5 fill-white" />
                              <span className="font-semibold">{post.likes_count || 0}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                          <span className="text-muted-foreground text-xs text-center line-clamp-3">
                            {post.content}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nessun post pubblicato</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* JOLLY PROFILE */}
        {profile.role === "jolly" && (
          <Tabs defaultValue="servizi" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="servizi">Servizi</TabsTrigger>
              <TabsTrigger value="post">Post</TabsTrigger>
            </TabsList>

            <TabsContent value="servizi" className="mt-6">
              {profile.services && profile.services.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.services.map((service) => (
                    <Card
                      key={service.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => {
                        if (service.service_type === "supplier") {
                          setSelectedSupplierService(service.id)
                          setShowCatalogDialog(true)
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {service.description || "Nessuna descrizione"}
                        </p>
                        <div className="space-y-1">
                          {service.service_type === "property_management" && service.percentage_commission && (
                            <p className="text-sm">
                              <span className="font-semibold">{service.percentage_commission}%</span>
                              <span className="text-muted-foreground"> commissione</span>
                            </p>
                          )}
                          {service.service_type === "driver" && (
                            <>
                              {service.vehicle_type && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Vettura: </span>
                                  <span className="font-semibold">{service.vehicle_type}</span>
                                </p>
                              )}
                              {service.price_per_route && Object.keys(service.price_per_route).length > 0 && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Prezzi: </span>
                                  <span className="font-semibold">
                                    €{Object.values(service.price_per_route)[0]} - €
                                    {Object.values(service.price_per_route)[Object.values(service.price_per_route).length - 1]}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                          {service.price_per_hour && (
                            <p className="text-sm">
                              <span className="font-semibold">€{service.price_per_hour}</span>
                              <span className="text-muted-foreground">/ora</span>
                            </p>
                          )}
                          {service.price_per_service && (
                            <p className="text-sm">
                              <span className="font-semibold">€{service.price_per_service}</span>
                              <span className="text-muted-foreground">/servizio</span>
                            </p>
                          )}
                          {service.service_type === "supplier" && (
                            <p className="text-sm text-primary font-semibold">
                              🛍️ Clicca per vedere il catalogo
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun servizio disponibile</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="post" className="mt-6">
              {profile.posts && profile.posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {profile.posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        if (!session?.user?.id) {
                          setShowAuthDialog(true)
                          return
                        }
                        router.push(`/posts/${post.id}`)
                      }}
                      className="relative aspect-square group cursor-pointer"
                    >
                      {post.images && post.images.length > 0 ? (
                        <>
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart className="w-5 h-5 fill-white" />
                              <span className="font-semibold">{post.likes_count || 0}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                          <span className="text-muted-foreground text-xs text-center line-clamp-3">
                            {post.content}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nessun post pubblicato</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* TRAVELER/OTHER PROFILE */}
        {profile.role !== "host" && profile.role !== "creator" && profile.role !== "jolly" && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Post</h2>
            {profile.posts && profile.posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 md:gap-2">
                {profile.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="relative aspect-square group"
                  >
                    {post.images && post.images.length > 0 ? (
                      <>
                        <Image
                          src={post.images[0]}
                          alt="Post"
                          fill
                          sizes="(max-width: 768px) 33vw, 200px"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-1 text-white">
                            <Heart className="w-5 h-5 fill-white" />
                            <span className="font-semibold">{post.likes_count || 0}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                        <span className="text-muted-foreground text-xs text-center line-clamp-3">
                          {post.content}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nessun post pubblicato</p>
              </div>
            )}
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

      {/* Supplier Catalog Dialog */}
      {selectedSupplierService && (
        <SupplierCatalogDialog
          open={showCatalogDialog}
          onOpenChange={setShowCatalogDialog}
          serviceId={selectedSupplierService}
        />
      )}
    </div>
  )
}
