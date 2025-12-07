"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Post {
  id: string
  author_id: string
  content: string
  images: string[]
  location: string | null
  property_id: string | null
  like_count: number
  comment_count: number
  created_at: string
  author: {
    username: string
    full_name: string
    avatar_url: string
  }
  liked: boolean
}

export default function FeedPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostLocation, setNewPostLocation] = useState("")

  useEffect(() => {
    loadPosts()
  }, [session])

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      // Check which posts are liked by current user
      if (session?.user?.id && data) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", session.user.id)

        const likedPostIds = new Set(likes?.map((l) => l.post_id) || [])

        const postsWithLikes = data.map((post) => ({
          ...post,
          author: post.author,
          liked: likedPostIds.has(post.id),
        }))

        setPosts(postsWithLikes)
      } else {
        setPosts(data.map((post) => ({ ...post, author: post.author, liked: false })))
      }
    } catch (error) {
      console.error("Error loading posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per creare un post",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          creator_id: session.user.id,
          content: newPostContent,
          media_url: "", // media_url è obbligatorio, sarà aggiornato se si carica un'immagine
          location: newPostLocation || null,
        })
        .select()
        .single()

      if (error) throw error

      // Award points for creating post
      await supabase.from("points_history").insert({
        user_id: session.user.id,
        points: 15,
        action_type: "post",
        description: "Post creato",
      })

      // Update user points
      const { data: profile } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", session.user.id)
        .single()

      if (profile) {
        await supabase
          .from("profiles")
          .update({ points: profile.points + 15 })
          .eq("id", session.user.id)
      }

      toast({
        title: "Successo",
        description: "Post creato con successo!",
      })

      setNewPostContent("")
      setNewPostLocation("")
      loadPosts()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!session?.user?.id) return

    try {
      if (currentlyLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id)

        // Decrement like count via API
        await fetch("/api/decrement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_name: "posts",
            column_name: "like_count",
            row_id: postId,
          }),
        })
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: session.user.id,
        })

        // Increment like count via API
        await fetch("/api/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_name: "posts",
            column_name: "like_count",
            row_id: postId,
          }),
        })
      }

      loadPosts()
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 max-w-2xl">
        {session && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Crea un post</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <Input
                  placeholder="Cosa vuoi condividere?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  required
                />
                <Input
                  placeholder="Dove sei? (opzionale)"
                  value={newPostLocation}
                  onChange={(e) => setNewPostLocation(e.target.value)}
                />
                <Button type="submit" className="w-full">
                  Pubblica
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {post.author.avatar_url ? (
                      <Image
                        src={post.author.avatar_url}
                        alt={post.author.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-primary font-semibold">
                        {post.author.username?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {post.author.full_name || post.author.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{post.content}</p>
                {post.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{post.location}</span>
                  </div>
                )}
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {post.images.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        alt={`Post image ${idx + 1}`}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
                {post.property_id && (
                  <Link
                    href={`/properties/${post.property_id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    Vedi proprietà →
                  </Link>
                )}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id, post.liked)}
                  >
                    <Heart
                      className={`w-5 h-5 mr-2 ${
                        post.liked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {post.like_count}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {post.comment_count}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-5 h-5 mr-2" />
                    Condividi
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

