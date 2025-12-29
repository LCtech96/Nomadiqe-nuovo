"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import { Users, Euro, Heart, MessageCircle, Share2, User, MoreVertical, Edit, Trash2, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SharePostDialog from "@/components/share-post-dialog"
import EditPostDialog from "@/components/edit-post-dialog"
import UserSearch from "@/components/user-search"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [showComments, setShowComments] = useState<string | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [postToEdit, setPostToEdit] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [savingRole, setSavingRole] = useState(false)

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
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116" && error.code !== "PGRST301") {
        console.error("Error loading profile:", error)
      }

      if (profileData) {
        setProfile(profileData)
        // Se l'utente ha un ruolo, carica i post
        if (profileData.role) {
          await loadPosts()
        }
      }
      // Se l'utente non ha ancora un ruolo, mostriamo la selezione dei ruoli
      // Non reindirizziamo all'onboarding, restiamo sulla home
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
  }

  const handleRoleSubmit = async () => {
    if (!session?.user?.id || !selectedRole) return

    setSavingRole(true)
    try {
      // Controlla se il profilo esiste
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()

      if (!existingProfile) {
        // Crea nuovo profilo
        const newProfileData: any = {
          id: session.user.id,
          email: session.user.email || "",
          role: selectedRole,
          full_name: session.user.name || session.user.email?.split("@")[0] || "",
          username: session.user.email?.split("@")[0] || "",
        }

        const { error: insertError } = await supabase
          .from("profiles")
          .insert(newProfileData)

        if (insertError) {
          console.error("Insert error:", insertError)
          throw insertError
        }
      } else {
        // Aggiorna profilo esistente
        const updateData: any = {
          role: selectedRole,
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", session.user.id)

        if (updateError) {
          console.error("Update error:", updateError)
          throw updateError
        }
      }

      toast({
        title: "Successo",
        description: `Ruolo ${selectedRole} selezionato!`,
      })

      // Reindirizza all'onboarding per completare il profilo
      router.push("/onboarding")
    } catch (error: any) {
      console.error("Error saving role:", error)
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il salvataggio. Riprova.",
        variant: "destructive",
      })
    } finally {
      setSavingRole(false)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!session?.user?.id) return

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id)

        // Update like count
        await supabase.rpc("decrement_post_likes", { post_id: postId })
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: session.user.id,
          })

        // Update like count
        await supabase.rpc("increment_post_likes", { post_id: postId })
        
        // Invia messaggio AI per il like (non bloccare se fallisce)
        try {
          const { sendLikeMessage } = await import("@/lib/ai-interactions")
          await sendLikeMessage(session.user.id)
        } catch (aiError) {
          console.warn("Errore nell'invio del messaggio AI per like (non critico):", aiError)
        }
      }

      // Reload posts
      await loadPosts()
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  const toggleComments = async (postId: string) => {
    if (showComments === postId) {
      setShowComments(null)
      setComments([])
    } else {
      setShowComments(postId)
      await loadComments(postId)
    }
  }

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          *,
          user:profiles!post_comments_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!session?.user?.id || !newComment.trim()) return

    try {
      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: session.user.id,
          content: newComment.trim(),
        })

      if (error) throw error

      // Update comment count
      await supabase.rpc("increment_post_comments", { post_id: postId })

      setNewComment("")
      await loadComments(postId)
      await loadPosts()
      
      // Invia messaggio AI per il commento (non bloccare se fallisce)
      try {
        const { sendCommentMessage } = await import("@/lib/ai-interactions")
        await sendCommentMessage(session.user.id)
      } catch (aiError) {
        console.warn("Errore nell'invio del messaggio AI per commento (non critico):", aiError)
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere il commento",
        variant: "destructive",
      })
    }
  }

  const handleShare = (post: any) => {
    setSelectedPost(post)
    setShowShareDialog(true)
  }

  const loadPosts = async () => {
    try {
      // Load posts first
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (postsError) {
        console.error("Error loading posts:", postsError)
        return
      }

      if (!postsData || postsData.length === 0) {
        setPosts([])
        return
      }

      // Get unique author IDs
      const authorIds = Array.from(new Set(postsData.map((p: any) => p.author_id).filter(Boolean)))
      
      if (authorIds.length === 0) {
        setPosts(postsData.map((post: any) => ({ ...post, author: null, liked: false })))
        return
      }

      // Load profiles for authors
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role")
        .in("id", authorIds)

      // Create a map for quick lookup
      const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]))

      // Check which posts are liked by current user
      let likedPostIds = new Set<string>()
      if (session?.user?.id) {
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", session.user.id)

        likedPostIds = new Set(likesData?.map((l) => l.post_id) || [])
      }

      // Combine posts with author data and like status
      const mappedPosts = postsData.map((post: any) => ({
        ...post,
        author: profilesMap.get(post.author_id) || null,
        liked: likedPostIds.has(post.id)
      }))

      setPosts(mappedPosts)
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div>Caricamento...</div></div>
  }

  if (!session) {
    return null
  }

  // Se l'utente non ha ancora un ruolo, mostra la selezione dei ruoli
  if (!profile?.role) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-32">
        <div className="container mx-auto p-4 max-w-2xl">
          <Card className="mt-8">
            <CardContent className="p-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Benvenuto su Nomadiqe!</h1>
              <p className="text-muted-foreground mb-6">
                Scegli come vuoi utilizzare Nomadiqe per iniziare
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedRole === "traveler" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleRoleSelect("traveler")}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">Traveler</h3>
                    <p className="text-sm text-muted-foreground mb-2">Viaggia e scopri</p>
                    <p className="text-xs text-muted-foreground">
                      Cerca e prenota alloggi, connettiti con altri viaggiatori
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedRole === "host" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleRoleSelect("host")}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">Host</h3>
                    <p className="text-sm text-muted-foreground mb-2">Pubblica la tua struttura</p>
                    <p className="text-xs text-muted-foreground">
                      Pubblica proprietà e collabora con creator
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedRole === "creator" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleRoleSelect("creator")}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">Creator</h3>
                    <p className="text-sm text-muted-foreground mb-2">Crea e collabora</p>
                    <p className="text-xs text-muted-foreground">
                      Collabora con host per creare contenuti
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedRole === "manager" ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleRoleSelect("manager")}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">Manager</h3>
                    <p className="text-sm text-muted-foreground mb-2">Offri servizi</p>
                    <p className="text-xs text-muted-foreground">
                      Offri servizi di gestione, pulizie e altro
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Button
                onClick={handleRoleSubmit}
                className="w-full"
                disabled={!selectedRole || savingRole}
              >
                {savingRole ? "Salvataggio..." : "Continua"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleEditPost = (post: any) => {
    setPostToEdit(post)
    setShowEditDialog(true)
  }

  const handleDeletePost = async (postId: string) => {
    if (!session?.user?.id) return

    if (!confirm("Sei sicuro di voler eliminare questo post?")) {
      return
    }

    try {
      // Delete post likes
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)

      // Delete post comments
      await supabase
        .from("post_comments")
        .delete()
        .eq("post_id", postId)

      // Delete post reposts
      await supabase
        .from("post_reposts")
        .delete()
        .eq("original_post_id", postId)

      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", session.user.id)

      if (error) throw error

      toast({
        title: "Post eliminato",
        description: "Il post è stato eliminato con successo",
      })

      await loadPosts()
    } catch (error: any) {
      console.error("Error deleting post:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile eliminare il post",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-32">
      <div className="px-1 md:px-4">
        {/* Sticky Search Bar for Mobile */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-1 md:-mx-4 px-5 md:px-4 pt-4 pb-4 mb-4 md:static md:bg-transparent md:backdrop-blur-none md:mx-0 md:px-0 md:pt-0 md:pb-0">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Home</h1>
          
          {/* User Search Bar */}
          <div className="mb-2 md:mb-6">
            <UserSearch userRole={profile?.role || null} />
          </div>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun post disponibile al momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 cursor-pointer ring-1 ring-border/50"
                        onClick={() => post.author?.id && router.push(`/profile/${post.author.id}`)}
                      >
                        {post.author?.avatar_url ? (
                          <Image
                            src={post.author.avatar_url}
                            alt={post.author.username || "User"}
                            fill
                            sizes="44px"
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
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-semibold text-sm cursor-pointer hover:underline"
                          onClick={() => post.author?.id && router.push(`/profile/${post.author.id}`)}
                        >
                          {post.author?.full_name || post.author?.username || "Utente"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {/* Menu a tre puntini per il proprietario del post */}
                      {session?.user?.id === post.author_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="p-2 md:p-1 hover:bg-accent active:bg-accent rounded-full transition-colors touch-manipulation"
                              aria-label="Menu opzioni post"
                            >
                              <MoreVertical className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 md:w-auto">
                            <DropdownMenuItem 
                              onClick={() => handleEditPost(post)}
                              className="cursor-pointer touch-manipulation"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              <span className="text-sm md:text-base">Modifica</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeletePost(post.id)}
                              className="text-destructive focus:text-destructive cursor-pointer touch-manipulation"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              <span className="text-sm md:text-base">Elimina</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  
                  {post.content && (
                    <div className="px-5 py-2">
                      <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{post.content}</p>
                    </div>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <Link href={`/posts/${post.id}`}>
                      <div className="relative w-full aspect-[4/3] overflow-hidden cursor-pointer bg-muted">
                        <Image
                          src={post.images[0]}
                          alt="Post image"
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={false}
                        />
                      </div>
                    </Link>
                  )}
                  
                  <div className="px-5 pb-5 pt-2">
                    <div className="flex items-center gap-8 border-t border-border/50 pt-3.5">
                      {/* Like Button */}
                      <button 
                        onClick={() => handleLike(post.id, post.liked)}
                        className={`flex items-center gap-2 transition-all active:scale-95 ${
                          post.liked 
                            ? "text-red-500" 
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${post.liked ? "fill-current" : ""} transition-all`} />
                        <span className="text-sm font-semibold">{post.like_count || 0}</span>
                      </button>

                      {/* Comment Button */}
                      <button 
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all active:scale-95"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold">{post.comment_count || 0}</span>
                      </button>

                      {/* Share Button */}
                      <button 
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all active:scale-95"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments === post.id && (
                    <div className="px-5 pb-5 pt-2 border-t border-border/50 space-y-4">
                      {/* Comment Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Aggiungi un commento..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleAddComment(post.id)
                            }
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment.trim()}
                        >
                          Invia
                        </Button>
                      </div>

                      {/* Comments List */}
                      {comments.length > 0 && (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div 
                                className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 cursor-pointer"
                                onClick={() => comment.user?.id && router.push(`/profile/${comment.user.id}`)}
                              >
                                {comment.user?.avatar_url ? (
                                  <Image
                                    src={comment.user.avatar_url}
                                    alt={comment.user.username || "User"}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p 
                                  className="text-sm font-semibold cursor-pointer hover:underline"
                                  onClick={() => comment.user?.id && router.push(`/profile/${comment.user.id}`)}
                                >
                                  {comment.user?.username || comment.user?.full_name || "Utente"}
                                </p>
                                <p className="text-sm text-muted-foreground">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {selectedPost && (
        <SharePostDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          post={selectedPost}
        />
      )}

      {/* Edit Post Dialog */}
      {postToEdit && (
        <EditPostDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          post={postToEdit}
          onPostUpdated={loadPosts}
        />
      )}
    </div>
  )
}
