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
import dynamic from "next/dynamic"

const SharePostDialog = dynamic(() => import("@/components/share-post-dialog"), { ssr: false })
const EditPostDialog = dynamic(() => import("@/components/edit-post-dialog"), { ssr: false })
import UserSearch from "@/components/user-search"
import { renderLinkContent } from "@/lib/render-link-content"
import { TranslatedComment } from "@/components/translated-comment"
import { useI18n } from "@/lib/i18n/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HomePage() {
  const { data: session, status } = useSession()
  const { t } = useI18n()
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
  const [filterRole, setFilterRole] = useState<string | null>(null)

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
        
        // CONTROLLO ONBOARDING OBBLIGATORIO PER HOST
        // Se l'utente è host e non ha completato l'onboarding, reindirizza forzatamente
        if (profileData.role === "host" && !profileData.onboarding_completed) {
          console.log("Host onboarding not completed - redirecting to onboarding")
          router.push("/onboarding")
          return
        }
        
        // Se l'utente non ha un ruolo, reindirizza all'onboarding
        if (!profileData.role) {
          console.log("User has no role - redirecting to onboarding")
          router.push("/onboarding")
          return
        }
        
        // Carica sempre i post, anche se l'utente non ha un ruolo
        await loadPosts()
      } else {
        // Se non c'è un profilo, reindirizza all'onboarding
        console.log("No profile found - redirecting to onboarding")
        router.push("/onboarding")
        return
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
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
        // Verifica se il like esiste già prima di inserirlo
        const { data: existingLike } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", session.user.id)
          .maybeSingle()

        // Se il like non esiste, inseriscilo
        if (!existingLike) {
          const { error: insertError } = await supabase
            .from("post_likes")
            .insert({
              post_id: postId,
              user_id: session.user.id,
            })

          // Se c'è un errore 409 (duplicato), ignoralo perché significa che il like esiste già
          if (insertError && insertError.code !== '23505') {
            throw insertError
          }

          // Update like count solo se l'inserimento è andato a buon fine
          if (!insertError || insertError.code === '23505') {
            await supabase.rpc("increment_post_likes", { post_id: postId })
            
            // Invia messaggio AI per il like (non bloccare se fallisce)
            try {
              const { sendLikeMessage } = await import("@/lib/ai-interactions")
              const result = await sendLikeMessage(session.user.id)
              if (result.success && result.showDisclaimer) {
                toast({
                  title: "💬 Controlla i tuoi messaggi",
                  description: "L'assistente AI ti ha inviato un messaggio! Puoi trovarlo nella sezione Messaggi del tuo profilo, accessibile dalla barra di navigazione in alto.",
                  duration: 6000,
                })
              }
            } catch (aiError) {
              console.warn("Errore nell'invio del messaggio AI per like (non critico):", aiError)
            }
          }
        }
      }

      // Reload posts
      await loadPosts()
    } catch (error: any) {
      console.error("Error liking post:", error)
      // Non mostrare errore se è un 409 (duplicato) - significa che il like esiste già
      if (error?.code !== '23505' && error?.status !== 409) {
        toast({
          title: "Errore",
          description: "Impossibile mettere like al post",
          variant: "destructive",
        })
      }
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
        const result = await sendCommentMessage(session.user.id)
        if (result.success && result.showDisclaimer) {
          toast({
            title: "💬 Controlla i tuoi messaggi",
            description: "L'assistente AI ti ha inviato un messaggio! Puoi trovarlo nella sezione Messaggi del tuo profilo, accessibile dalla barra di navigazione in alto.",
            duration: 6000,
          })
        }
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
      // Load posts first (solo approvati)
      let query = supabase
        .from("posts")
        .select("*")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(50)

      const { data: postsData, error: postsError } = await query

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

      // Load profiles for authors (include host_level for Prime link feature)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role, host_level")
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
      let mappedPosts = postsData.map((post: any) => ({
        ...post,
        author: profilesMap.get(post.author_id) || null,
        liked: likedPostIds.has(post.id)
      }))

      // Filtra per ruolo se selezionato
      if (filterRole) {
        mappedPosts = mappedPosts.filter((post: any) => post.author?.role === filterRole)
      }

      setPosts(mappedPosts)
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }

  // Ricarica i post quando cambia il filtro ruolo
  useEffect(() => {
    if (session?.user?.id) {
      loadPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole])

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

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div>Caricamento...</div></div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-32">
      <div className="px-1 md:px-4">
        {/* Sticky Search Bar for Mobile */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-1 md:-mx-4 px-5 md:px-4 pt-4 pb-4 mb-4 md:static md:bg-transparent md:backdrop-blur-none md:mx-0 md:px-0 md:pt-0 md:pb-0">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Home</h1>
          
          {/* User Search Bar */}
          <div className="mb-2 md:mb-4">
            <UserSearch userRole={profile?.role || null} />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex gap-2 mb-4 md:mb-6 flex-wrap">
            <Button
              variant={filterRole === null ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterRole(null)
                loadPosts()
              }}
              className="text-xs md:text-sm"
            >
              Tutti
            </Button>
            <Button
              variant={filterRole === "host" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterRole("host")
                loadPosts()
              }}
              className="text-xs md:text-sm"
            >
              Host
            </Button>
            <Button
              variant={filterRole === "creator" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterRole("creator")
                loadPosts()
              }}
              className="text-xs md:text-sm"
            >
              Creator
            </Button>
            <Button
              variant={filterRole === "traveler" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterRole("traveler")
                loadPosts()
              }}
              className="text-xs md:text-sm"
            >
              Traveler
            </Button>
            <Button
              variant={filterRole === "jolly" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterRole("jolly")
                loadPosts()
              }}
              className="text-xs md:text-sm"
            >
              Jolly
            </Button>
          </div>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun post disponibile al momento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <Card key={post.id} className="overflow-hidden border border-gray-200/60 shadow-xl shadow-gray-200/50 bg-white/98 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40 hover:scale-[1.02] hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 cursor-pointer ring-2 ring-gray-200/60 hover:ring-4 hover:ring-purple-200/50 transition-all duration-200"
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
                      {renderLinkContent(post.content)}
                    </div>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <Link href={`/posts/${post.id}`}>
                      <div className="relative w-full aspect-[4/3] overflow-hidden cursor-pointer bg-muted rounded-2xl">
                        <Image
                          src={post.images[0]}
                          alt="Post image"
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover hover:scale-105 transition-transform duration-500"
                          priority={idx < 2}
                        />
                      </div>
                    </Link>
                  )}
                  
                  <div className="px-5 pb-5 pt-2">
                    <div className="flex items-center gap-8 border-t border-gray-200/50 pt-3.5">
                      {/* Like Button */}
                      <button 
                        onClick={() => handleLike(post.id, post.liked)}
                        className={`flex items-center gap-2 transition-all duration-200 active:scale-95 ${
                          post.liked 
                            ? "text-red-500" 
                            : "text-gray-500 hover:text-red-500"
                        }`}
                      >
                        <Heart className={`w-5 h-5 transition-colors duration-200 ${post.liked ? "fill-current" : ""}`} />
                        <span className="text-sm font-semibold">{post.like_count || 0}</span>
                      </button>

                      {/* Comment Button */}
                      <button 
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all duration-200 active:scale-95"
                      >
                        <MessageCircle className="w-5 h-5 transition-colors duration-200" />
                        <span className="text-sm font-semibold">{post.comment_count || 0}</span>
                      </button>

                      {/* Share Button */}
                      <button 
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all duration-200 active:scale-95"
                      >
                        <Share2 className="w-5 h-5 transition-colors duration-200" />
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
                          placeholder={t('post.addComment')}
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
                          {t('post.send')}
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
                                <TranslatedComment 
                                  content={comment.content} 
                                  className="text-sm text-muted-foreground"
                                />
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
