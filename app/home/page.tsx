"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import { Users, Euro, Heart, MessageCircle, Share2, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

      if (error || !profileData) {
        router.push("/onboarding")
        return
      }

      setProfile(profileData)
      await loadPosts()
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
        // Like
        await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: session.user.id,
          })

        // Update like count
        await supabase.rpc("increment_post_likes", { post_id: postId })
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
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere il commento",
        variant: "destructive",
      })
    }
  }

  const handleShare = async (post: any) => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    const shareText = post.content ? `${post.content.substring(0, 100)}...` : "Guarda questo post su Nomadiqe!"

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Post su Nomadiqe",
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        console.log("Condivisione annullata")
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link copiato!",
          description: "Il link del post è stato copiato negli appunti",
        })
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile condividere il post",
          variant: "destructive",
        })
      }
    }
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

      // Combine posts with author data
      const mappedPosts = postsData.map((post: any) => ({
        ...post,
        author: profilesMap.get(post.author_id) || null,
        liked: false
      }))

      setPosts(mappedPosts)
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div>Caricamento...</div></div>
  }

  if (!profile || !session) {
    return null
  }

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
                          sizes="40px"
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
                      <p className="font-semibold text-sm">
                        {post.author?.full_name || post.author?.username || "Utente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                  
                  {post.content && (
                    <p className="mb-4">{post.content}</p>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden mb-4">
                      <Image
                        src={post.images[0]}
                        alt="Post image"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-6 pt-4 border-t">
                    {/* Like Button */}
                    <button 
                      onClick={() => handleLike(post.id, post.liked)}
                      className={`flex items-center gap-1 transition-colors ${
                        post.liked 
                          ? "text-red-500" 
                          : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.liked ? "fill-current" : ""}`} />
                      <span>{post.like_count || 0}</span>
                    </button>

                    {/* Comment Button */}
                    <button 
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{post.comment_count || 0}</span>
                    </button>

                    {/* Share Button */}
                    <button 
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Comments Section */}
                  {showComments === post.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
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
                              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
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
                                <p className="text-sm font-semibold">
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
    </div>
  )
}
