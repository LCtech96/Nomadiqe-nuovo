"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import Image from "next/image"
import { Heart, MessageCircle, Share2, User, ArrowLeft, MoreVertical, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SharePostDialog from "@/components/share-post-dialog"
import EditPostDialog from "@/components/edit-post-dialog"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [post, setPost] = useState<any>(null)
  const [author, setAuthor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadPost(params.id as string)
    }
  }, [params.id, session])

  const loadPost = async (postId: string) => {
    try {
      // Load post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single()

      if (postError) throw postError
      if (!postData) {
        toast({
          title: "Post non trovato",
          description: "Il post che stai cercando non esiste",
          variant: "destructive",
        })
        router.push("/home")
        return
      }

      setPost(postData)

      // Load author
      if (postData.author_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, role")
          .eq("id", postData.author_id)
          .single()

        setAuthor(authorData)
      }

      // Check if liked
      if (session?.user?.id) {
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", session.user.id)
          .maybeSingle()

        setLiked(!!likeData)
      }

      // Load comments
      await loadComments(postId)
    } catch (error: any) {
      console.error("Error loading post:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile caricare il post",
        variant: "destructive",
      })
      router.push("/home")
    } finally {
      setLoading(false)
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

  const handleLike = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per mettere like",
        variant: "destructive",
      })
      return
    }

    if (!post) return

    try {
      if (liked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id)

        await supabase.rpc("decrement_post_likes", { post_id: post.id })
        setLiked(false)
        setPost((prev: any) => ({
          ...prev,
          like_count: Math.max(0, (prev.like_count || 0) - 1),
        }))
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({
            post_id: post.id,
            user_id: session.user.id,
          })

        await supabase.rpc("increment_post_likes", { post_id: post.id })
        setLiked(true)
        setPost((prev: any) => ({
          ...prev,
          like_count: (prev.like_count || 0) + 1,
        }))
      }
    } catch (error: any) {
      console.error("Error liking post:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile mettere like",
        variant: "destructive",
      })
    }
  }

  const handleAddComment = async () => {
    if (!session?.user?.id || !newComment.trim() || !post) return

    try {
      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          user_id: session.user.id,
          content: newComment.trim(),
        })

      if (error) throw error

      await supabase.rpc("increment_post_comments", { post_id: post.id })

      setNewComment("")
      await loadComments(post.id)
      setPost((prev: any) => ({
        ...prev,
        comment_count: (prev.comment_count || 0) + 1,
      }))
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiungere il commento",
        variant: "destructive",
      })
    }
  }

  const handleDeletePost = async () => {
    if (!session?.user?.id || !post) return

    if (!confirm("Sei sicuro di voler eliminare questo post?")) {
      return
    }

    try {
      // Delete post likes
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)

      // Delete post comments
      await supabase
        .from("post_comments")
        .delete()
        .eq("post_id", post.id)

      // Delete post reposts
      await supabase
        .from("post_reposts")
        .delete()
        .eq("original_post_id", post.id)

      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("author_id", session.user.id)

      if (error) throw error

      toast({
        title: "Post eliminato",
        description: "Il post è stato eliminato con successo",
      })

      router.push("/home")
    } catch (error: any) {
      console.error("Error deleting post:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile eliminare il post",
        variant: "destructive",
      })
    }
  }

  const handlePostUpdated = async () => {
    await loadPost(post.id)
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-20">
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
      </div>

      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="p-4">
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 cursor-pointer"
                onClick={() => author?.id && router.push(`/profile/${author.id}`)}
              >
                {author?.avatar_url ? (
                  <Image
                    src={author.avatar_url}
                    alt={author.username || "User"}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {(author?.username || author?.full_name || "U")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-sm cursor-pointer hover:underline"
                  onClick={() => author?.id && router.push(`/profile/${author.id}`)}
                >
                  {author?.full_name || author?.username || "Utente"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                      onClick={() => setShowEditDialog(true)}
                      className="cursor-pointer touch-manipulation"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      <span className="text-sm md:text-base">Modifica</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleDeletePost}
                      className="text-destructive focus:text-destructive cursor-pointer touch-manipulation"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span className="text-sm md:text-base">Elimina</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Post Content */}
            {post.content && (
              <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
            )}

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                <Image
                  src={post.images[0]}
                  alt="Post image"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 transition-colors ${
                  liked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                <span>{post.like_count || 0}</span>
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{post.comment_count || 0}</span>
              </button>

              <button
                onClick={() => setShowShareDialog(true)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {/* Comment Input */}
                {session?.user?.id && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Aggiungi un commento..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment()
                        }
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Invia
                    </Button>
                  </div>
                )}

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
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(comment.created_at).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Dialog */}
      <SharePostDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        post={post}
      />

      {/* Edit Post Dialog */}
      {post && (
        <EditPostDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          post={post}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  )
}


