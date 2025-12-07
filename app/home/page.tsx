"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import { Users, Euro, Heart } from "lucide-react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
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
      const authorIds = [...new Set(postsData.map((p: any) => p.author_id).filter(Boolean))]
      
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
                  
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="w-5 h-5" />
                      <span>{post.likes_count || 0}</span>
                    </button>
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
