"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import Image from "next/image"
import { renderLinkContent } from "@/lib/render-link-content"

type Post = {
  id: string
  content: string | null
  images: string[] | null
  video_url: string | null
  approval_status: string
  created_at: string
  author_id: string
  author: {
    full_name?: string
    username?: string
    email?: string
    role?: string
  } | null
}

export default function PostApprovalPanel() {
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/posts?status=pending", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      setPosts(data.posts || [])
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile caricare",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAction = async (postId: string, action: "approve" | "reject") => {
    setActingId(postId)
    try {
      const res = await fetch(`/api/admin/posts/${postId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({
        title: action === "approve" ? "Approvato" : "Rifiutato",
        description:
          action === "approve"
            ? "Il post è ora visibile nel feed."
            : "Il post è stato rifiutato.",
      })
      await load()
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Operazione fallita",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento post in attesa...
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvazione post</CardTitle>
        <CardDescription>
          I post creati dagli utenti devono essere approvati prima di essere visibili nel feed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nessun post in attesa di approvazione.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Da: {post.author?.full_name || post.author?.username || post.author?.email || post.author_id}
                      {post.author?.role && (
                        <Badge variant="outline" className="ml-2">
                          {post.author.role}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleString("it-IT")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(post.id, "approve")}
                      disabled={!!actingId}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {actingId === post.id ? "..." : "Approva"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(post.id, "reject")}
                      disabled={!!actingId}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>

                {post.content && (
                  <div className="text-sm whitespace-pre-wrap">
                    {renderLinkContent(post.content)}
                  </div>
                )}

                {post.images && post.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.images.slice(0, 5).map((url, i) => (
                      <div
                        key={i}
                        className="relative w-24 h-24 rounded overflow-hidden border"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {post.video_url && (
                  <div className="relative w-full max-w-md aspect-video rounded overflow-hidden border">
                    <video
                      src={post.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
