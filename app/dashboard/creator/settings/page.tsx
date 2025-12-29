"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  Settings,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  BarChart3,
  Eye,
  Users,
  Heart,
  MessageSquare,
  TrendingUp,
  Save,
  Instagram,
  Youtube,
  Check,
  X,
} from "lucide-react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SocialAccount {
  id: string
  platform: string
  username: string
  follower_count: number
  engagement_rate: number | null
  verified: boolean
}

interface Collaboration {
  id: string
  property_id: string
  status: string
  is_visible: boolean
  property: {
    id: string
    name: string
    city: string
    country: string
    images: string[] | null
  }
}

interface Post {
  id: string
  content: string | null
  images: string[] | null
  visibility_audience: string[] | null
  likes_count?: number
  comments_count?: number
  like_count?: number
  comment_count?: number
  created_at: string
}

interface Analytics {
  profileViews: number
  totalFollowers: number
  totalFollowing: number
  totalPosts: number
  totalLikes: number
  totalComments: number
  totalInteractions: number
  engagementRate: number
  totalReach: number
}

export default function CreatorSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({
    profileViews: 0,
    totalFollowers: 0,
    totalFollowing: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalInteractions: 0,
    engagementRate: 0,
    totalReach: 0,
  })

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session])

  const loadData = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Load social accounts
      const { data: socialData } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", session.user.id)

      setSocialAccounts(socialData || [])

      // Load collaborations
      const { data: collabsData } = await supabase
        .from("collaborations")
        .select(`
          id,
          property_id,
          status,
          is_visible,
          property:properties(id, name, city, country, images)
        `)
        .eq("creator_id", session.user.id)

      setCollaborations((collabsData || []).map((c: any) => ({
        ...c,
        property: Array.isArray(c.property) ? c.property[0] : c.property,
      })))

      // Load posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content, images, visibility_audience, like_count, comment_count, likes_count, comments_count, created_at")
        .eq("author_id", session.user.id)
        .order("created_at", { ascending: false })

      setPosts(postsData || [])

      // Load analytics
      await loadAnalytics()
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    if (!session?.user?.id) return

    try {
      // Profile views
      const { count: viewsCount } = await supabase
        .from("profile_views")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", session.user.id)

      // Followers/Following
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", session.user.id)

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", session.user.id)

      // Posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", session.user.id)

      // Total likes and comments
      const { data: userPosts } = await supabase
        .from("posts")
        .select("like_count, comment_count, likes_count, comments_count")
        .eq("author_id", session.user.id)

      const totalLikes = (userPosts || []).reduce((sum, p) => sum + (p.likes_count || p.like_count || 0), 0)
      const totalComments = (userPosts || []).reduce((sum, p) => sum + (p.comments_count || p.comment_count || 0), 0)
      const totalInteractions = totalLikes + totalComments

      // Engagement rate
      const totalReach = viewsCount || 1
      const engagementRate = totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0

      setAnalytics({
        profileViews: viewsCount || 0,
        totalFollowers: followersCount || 0,
        totalFollowing: followingCount || 0,
        totalPosts: postsCount || 0,
        totalLikes,
        totalComments,
        totalInteractions,
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalReach,
      })
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
  }

  const handleToggleCollaborationVisibility = async (collabId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from("collaborations")
        .update({ is_visible: !currentVisibility })
        .eq("id", collabId)

      if (error) throw error

      toast({
        title: "Successo",
        description: `Collaborazione ${!currentVisibility ? "resa visibile" : "nascosta"}`,
      })

      loadData()
    } catch (error: any) {
      console.error("Error toggling visibility:", error)
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la visibilità.",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePostVisibility = async (postId: string, audience: string[]) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ visibility_audience: audience })
        .eq("id", postId)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Visibilità del post aggiornata",
      })

      loadData()
    } catch (error: any) {
      console.error("Error updating post visibility:", error)
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la visibilità.",
        variant: "destructive",
      })
    }
  }

  const getVisibilityLabel = (audience: string[] | null) => {
    if (!audience || audience.length === 0 || audience.includes("public")) {
      return "Pubblico"
    }
    return audience.join(", ")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Impostazioni Creator</h1>
          <p className="text-muted-foreground">Gestisci il tuo profilo, contenuti e analitiche</p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analitiche
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Contenuti
            </TabsTrigger>
            <TabsTrigger value="collaborations">
              <Users className="w-4 h-4 mr-2" />
              Collaborazioni
            </TabsTrigger>
            <TabsTrigger value="social">
              <Instagram className="w-4 h-4 mr-2" />
              Social
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Visualizzazioni Profilo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{analytics.profileViews}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Follower</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{analytics.totalFollowers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Interazioni Totali
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{analytics.totalInteractions}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.totalLikes} like, {analytics.totalComments} commenti
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Engagement Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{analytics.engagementRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Statistiche Dettagliate</CardTitle>
                <CardDescription>Panoramica completa della tua performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Post Totali</p>
                    <p className="text-2xl font-bold">{analytics.totalPosts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Following</p>
                    <p className="text-2xl font-bold">{analytics.totalFollowing}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Like Totali</p>
                    <p className="text-2xl font-bold">{analytics.totalLikes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commenti Totali</p>
                    <p className="text-2xl font-bold">{analytics.totalComments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestisci Visibilità Post</CardTitle>
                <CardDescription>
                  Controlla chi può vedere i tuoi post
                </CardDescription>
              </CardHeader>
              <CardContent>
                {posts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun post ancora
                  </p>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {post.images && post.images.length > 0 && (
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                                <Image
                                  src={post.images[0]}
                                  alt="Post"
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold mb-2 line-clamp-2">
                                {post.content || "Post senza testo"}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                <span>{post.likes_count || post.like_count || 0} like</span>
                                <span>{post.comments_count || post.comment_count || 0} commenti</span>
                                <span>{new Date(post.created_at).toLocaleDateString("it-IT")}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Visibilità:</Label>
                                <Select
                                  value={
                                    post.visibility_audience?.includes("public")
                                      ? "public"
                                      : post.visibility_audience?.join(",") || "public"
                                  }
                                  onValueChange={(value) => {
                                    const audience =
                                      value === "public"
                                        ? ["public"]
                                        : value.split(",").filter(Boolean)
                                    handleUpdatePostVisibility(post.id, audience)
                                  }}
                                >
                                  <SelectTrigger className="w-48 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="public">Pubblico (tutti)</SelectItem>
                                    <SelectItem value="host">Solo Host</SelectItem>
                                    <SelectItem value="manager">Solo Manager</SelectItem>
                                    <SelectItem value="traveler">Solo Traveler</SelectItem>
                                    <SelectItem value="creator">Solo Creator</SelectItem>
                                    <SelectItem value="host,manager">Host e Manager</SelectItem>
                                    <SelectItem value="host,creator">Host e Creator</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Badge variant="outline" className="text-xs">
                                  {getVisibilityLabel(post.visibility_audience)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Collaborations Tab */}
          <TabsContent value="collaborations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestisci Visibilità Collaborazioni</CardTitle>
                <CardDescription>
                  Nascondi o mostra le tue collaborazioni nel profilo pubblico
                </CardDescription>
              </CardHeader>
              <CardContent>
                {collaborations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessuna collaborazione ancora
                  </p>
                ) : (
                  <div className="space-y-4">
                    {collaborations.map((collab) => (
                      <Card key={collab.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4 flex-1 min-w-0">
                              {collab.property.images && collab.property.images.length > 0 && (
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                                  <Image
                                    src={collab.property.images[0]}
                                    alt={collab.property.name}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{collab.property.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {collab.property.city}, {collab.property.country}
                                </p>
                                <Badge
                                  variant={
                                    collab.status === "accepted" || collab.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="mt-2"
                                >
                                  {collab.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <Label htmlFor={`visibility-${collab.id}`} className="text-sm">
                                Visibile
                              </Label>
                              <Switch
                                id={`visibility-${collab.id}`}
                                checked={collab.is_visible !== false}
                                onCheckedChange={() =>
                                  handleToggleCollaborationVisibility(
                                    collab.id,
                                    collab.is_visible !== false
                                  )
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Social Collegati</CardTitle>
                <CardDescription>
                  Gestisci i tuoi account social per mostrare le tue metriche
                </CardDescription>
              </CardHeader>
              <CardContent>
                {socialAccounts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun account social collegato
                  </p>
                ) : (
                  <div className="space-y-4">
                    {socialAccounts.map((account) => (
                      <Card key={account.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {account.platform === "instagram" && (
                                <Instagram className="w-8 h-8 text-pink-500" />
                              )}
                              {account.platform === "youtube" && (
                                <Youtube className="w-8 h-8 text-red-500" />
                              )}
                              <div>
                                <p className="font-semibold">@{account.username}</p>
                                <p className="text-sm text-muted-foreground">
                                  {account.follower_count.toLocaleString()} follower
                                  {account.engagement_rate &&
                                    ` • ${account.engagement_rate}% engagement`}
                                  {account.verified && (
                                    <span className="ml-2">
                                      <Badge variant="default" className="text-xs">Verificato</Badge>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

