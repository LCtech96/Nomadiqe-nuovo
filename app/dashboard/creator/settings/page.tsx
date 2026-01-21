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
  profileViews: number | null
  totalFollowers: number | null
  totalFollowing: number | null
  totalPosts: number | null
  totalLikes: number | null
  totalComments: number | null
  totalInteractions: number | null
  engagementRate: number | null
  totalReach: number | null
  showProfileViews: boolean
  showFollowers: boolean
  showFollowing: boolean
  showPosts: boolean
  showInteractions: boolean
  showEngagementRate: boolean
  showReach: boolean
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
    profileViews: null,
    totalFollowers: null,
    totalFollowing: null,
    totalPosts: null,
    totalLikes: null,
    totalComments: null,
    totalInteractions: null,
    engagementRate: null,
    totalReach: null,
    showProfileViews: true,
    showFollowers: true,
    showFollowing: true,
    showPosts: true,
    showInteractions: true,
    showEngagementRate: true,
    showReach: true,
  })
  const [analyticsInputs, setAnalyticsInputs] = useState({
    profileViews: "",
    totalFollowers: "",
    totalFollowing: "",
    totalPosts: "",
    totalLikes: "",
    totalComments: "",
    totalReach: "",
    engagementRate: "",
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

      // Load manual analytics
      await loadManualAnalytics()
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

  const loadManualAnalytics = async () => {
    if (!session?.user?.id) return

    try {
      // Carica analitiche manuali
      const { data: manualData, error } = await supabase
        .from("creator_manual_analytics")
        .select("*")
        .eq("creator_id", session.user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading manual analytics:", error)
      }

      if (manualData) {
        setAnalytics({
          profileViews: manualData.profile_views,
          totalFollowers: manualData.total_followers,
          totalFollowing: manualData.total_following,
          totalPosts: manualData.total_posts,
          totalLikes: manualData.total_likes,
          totalComments: manualData.total_comments,
          totalInteractions: manualData.total_interactions,
          engagementRate: manualData.engagement_rate ? parseFloat(manualData.engagement_rate.toString()) : null,
          totalReach: manualData.total_reach,
          showProfileViews: manualData.show_profile_views ?? true,
          showFollowers: manualData.show_followers ?? true,
          showFollowing: manualData.show_following ?? true,
          showPosts: manualData.show_posts ?? true,
          showInteractions: manualData.show_interactions ?? true,
          showEngagementRate: manualData.show_engagement_rate ?? true,
          showReach: manualData.show_reach ?? true,
        })
        setAnalyticsInputs({
          profileViews: manualData.profile_views?.toString() || "",
          totalFollowers: manualData.total_followers?.toString() || "",
          totalFollowing: manualData.total_following?.toString() || "",
          totalPosts: manualData.total_posts?.toString() || "",
          totalLikes: manualData.total_likes?.toString() || "",
          totalComments: manualData.total_comments?.toString() || "",
          totalReach: manualData.total_reach?.toString() || "",
          engagementRate: manualData.engagement_rate?.toString() || "",
        })
      }
    } catch (error) {
      console.error("Error loading manual analytics:", error)
    }
  }

  const handleSaveAnalytics = async () => {
    if (!session?.user?.id) return

    setSaving(true)
    try {
      const analyticsData = {
        creator_id: session.user.id,
        profile_views: analyticsInputs.profileViews.trim() ? parseInt(analyticsInputs.profileViews) : null,
        total_followers: analyticsInputs.totalFollowers.trim() ? parseInt(analyticsInputs.totalFollowers) : null,
        total_following: analyticsInputs.totalFollowing.trim() ? parseInt(analyticsInputs.totalFollowing) : null,
        total_posts: analyticsInputs.totalPosts.trim() ? parseInt(analyticsInputs.totalPosts) : null,
        total_likes: analyticsInputs.totalLikes.trim() ? parseInt(analyticsInputs.totalLikes) : null,
        total_comments: analyticsInputs.totalComments.trim() ? parseInt(analyticsInputs.totalComments) : null,
        total_reach: analyticsInputs.totalReach.trim() ? parseInt(analyticsInputs.totalReach) : null,
        engagement_rate: analyticsInputs.engagementRate.trim() ? parseFloat(analyticsInputs.engagementRate) : null,
        total_interactions: (analyticsInputs.totalLikes.trim() ? parseInt(analyticsInputs.totalLikes) : 0) + 
                           (analyticsInputs.totalComments.trim() ? parseInt(analyticsInputs.totalComments) : 0),
        show_profile_views: analytics.showProfileViews,
        show_followers: analytics.showFollowers,
        show_following: analytics.showFollowing,
        show_posts: analytics.showPosts,
        show_interactions: analytics.showInteractions,
        show_engagement_rate: analytics.showEngagementRate,
        show_reach: analytics.showReach,
      }

      const { error } = await supabase
        .from("creator_manual_analytics")
        .upsert(analyticsData, {
          onConflict: "creator_id",
        })

      if (error) throw error

      toast({
        title: "Successo",
        description: "Analitiche salvate con successo",
      })

      await loadManualAnalytics()
    } catch (error: any) {
      console.error("Error saving analytics:", error)
      toast({
        title: "Errore",
        description: "Impossibile salvare le analitiche.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
            <Card>
              <CardHeader>
                <CardTitle>Inserisci le tue Analitiche</CardTitle>
                <CardDescription>
                  Inserisci manualmente le tue statistiche e controlla cosa mostrare nel tuo profilo pubblico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="profileViews">Visualizzazioni Profilo</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showProfileViews" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showProfileViews"
                          checked={analytics.showProfileViews}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showProfileViews: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="profileViews"
                      type="number"
                      min="0"
                      value={analyticsInputs.profileViews}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, profileViews: e.target.value }))
                      }
                      placeholder="Es. 1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalFollowers">Follower</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showFollowers" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showFollowers"
                          checked={analytics.showFollowers}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showFollowers: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="totalFollowers"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalFollowers}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalFollowers: e.target.value }))
                      }
                      placeholder="Es. 5000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalFollowing">Following</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showFollowing" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showFollowing"
                          checked={analytics.showFollowing}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showFollowing: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="totalFollowing"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalFollowing}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalFollowing: e.target.value }))
                      }
                      placeholder="Es. 300"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalPosts">Post Totali</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showPosts" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showPosts"
                          checked={analytics.showPosts}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showPosts: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="totalPosts"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalPosts}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalPosts: e.target.value }))
                      }
                      placeholder="Es. 150"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalLikes">Like Totali</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showInteractions" className="text-xs text-muted-foreground">
                          Mostra interazioni
                        </Label>
                        <Switch
                          id="showInteractions"
                          checked={analytics.showInteractions}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showInteractions: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="totalLikes"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalLikes}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalLikes: e.target.value }))
                      }
                      placeholder="Es. 5000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalComments">Commenti Totali</Label>
                    <Input
                      id="totalComments"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalComments}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalComments: e.target.value }))
                      }
                      placeholder="Es. 200"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalReach">Reach Totale</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showReach" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showReach"
                          checked={analytics.showReach}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showReach: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="totalReach"
                      type="number"
                      min="0"
                      value={analyticsInputs.totalReach}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, totalReach: e.target.value }))
                      }
                      placeholder="Es. 10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="engagementRate">Engagement Rate (%)</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="showEngagementRate" className="text-xs text-muted-foreground">
                          Mostra
                        </Label>
                        <Switch
                          id="showEngagementRate"
                          checked={analytics.showEngagementRate}
                          onCheckedChange={(checked: boolean) =>
                            setAnalytics((prev) => ({ ...prev, showEngagementRate: checked }))
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="engagementRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={analyticsInputs.engagementRate}
                      onChange={(e) =>
                        setAnalyticsInputs((prev) => ({ ...prev, engagementRate: e.target.value }))
                      }
                      placeholder="Es. 5.5"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveAnalytics} disabled={saving} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Salvataggio..." : "Salva Analitiche"}
                </Button>
              </CardContent>
            </Card>

            {/* Preview delle analitiche */}
            <Card>
              <CardHeader>
                <CardTitle>Anteprima Profilo Pubblico</CardTitle>
                <CardDescription>
                  Ecco come appaiono le tue analitiche nel profilo pubblico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analytics.showProfileViews && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Views</p>
                            <p className="text-2xl font-bold">
                              {analyticsInputs.profileViews || "—"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.showFollowers && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Follower</p>
                            <p className="text-2xl font-bold">
                              {analyticsInputs.totalFollowers || "—"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.showPosts && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Post</p>
                            <p className="text-2xl font-bold">
                              {analyticsInputs.totalPosts || "—"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.showEngagementRate && analyticsInputs.engagementRate && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Engagement</p>
                            <p className="text-2xl font-bold">
                              {analyticsInputs.engagementRate}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
                                    <SelectItem value="jolly">Solo Jolly</SelectItem>
                                    <SelectItem value="traveler">Solo Traveler</SelectItem>
                                    <SelectItem value="creator">Solo Creator</SelectItem>
                                    <SelectItem value="host,jolly">Host e Jolly</SelectItem>
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

