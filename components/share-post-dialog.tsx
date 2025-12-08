"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Share2, Link2, Repeat2, Copy, Check } from "lucide-react"

interface SharePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: {
    id: string
    content?: string | null
    images?: string[] | null
    author_id?: string
  }
}

export default function SharePostDialog({
  open,
  onOpenChange,
  post,
}: SharePostDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [linkCopied, setLinkCopied] = useState(false)
  const [reposting, setReposting] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${post.id}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopied(true)
      toast({
        title: "Link copiato!",
        description: "Il link è stato copiato negli appunti",
      })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      })
    }
  }

  const handleShareExternal = async () => {
    const shareText = post.content 
      ? `${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''} - Guarda questo post su Nomadiqe!`
      : "Guarda questo post su Nomadiqe!"

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Post su Nomadiqe",
          text: shareText,
          url: shareUrl,
        })
        // Increment share count
        await supabase.rpc("increment_post_shares", { post_id: post.id })
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error)
        }
      }
    } else {
      // Fallback: copy to clipboard
      await handleCopyLink()
    }
  }

  const handleRepost = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per fare repost",
        variant: "destructive",
      })
      return
    }

    setReposting(true)
    try {
      // Check if already reposted
      const { data: existingRepost } = await supabase
        .from("post_reposts")
        .select("id")
        .eq("original_post_id", post.id)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (existingRepost) {
        toast({
          title: "Attenzione",
          description: "Hai già fatto repost di questo post",
          variant: "destructive",
        })
        setReposting(false)
        return
      }

      // Create repost
      const { error: repostError } = await supabase
        .from("post_reposts")
        .insert({
          original_post_id: post.id,
          user_id: session.user.id,
        })

      if (repostError) throw repostError

      // Increment repost count
      await supabase.rpc("increment_post_reposts", { post_id: post.id })

      toast({
        title: "Repost completato!",
        description: "Il post è stato aggiunto al tuo profilo",
      })

      onOpenChange(false)
      
      // Navigate to user's profile to see the repost
      router.push("/profile")
    } catch (error: any) {
      console.error("Error reposting:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile fare repost del post",
        variant: "destructive",
      })
    } finally {
      setReposting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Condividi post</DialogTitle>
          <DialogDescription>
            Scegli come vuoi condividere questo post
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {/* Share External Link */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4"
            onClick={handleShareExternal}
          >
            <Share2 className="w-5 h-5" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Condividi fuori da Nomadiqe</div>
              <div className="text-sm text-muted-foreground">
                Crea un link per condividere su altri social o via messaggio
              </div>
            </div>
          </Button>

          {/* Copy Link */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4"
            onClick={handleCopyLink}
          >
            {linkCopied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Link2 className="w-5 h-5" />
            )}
            <div className="flex-1 text-left">
              <div className="font-semibold">
                {linkCopied ? "Link copiato!" : "Copia link"}
              </div>
              <div className="text-sm text-muted-foreground">
                Copia il link del post negli appunti
              </div>
            </div>
          </Button>

          {/* Repost */}
          {session?.user?.id && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={handleRepost}
              disabled={reposting}
            >
              <Repeat2 className="w-5 h-5" />
              <div className="flex-1 text-left">
                <div className="font-semibold">Ricondividi su Nomadiqe</div>
                <div className="text-sm text-muted-foreground">
                  Aggiungi questo post al tuo profilo
                </div>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
