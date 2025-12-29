"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { createSupabaseClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface EditPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: {
    id: string
    content: string | null
    images: string[] | null
  }
  onPostUpdated?: () => void
}

export default function EditPostDialog({
  open,
  onOpenChange,
  post,
  onPostUpdated,
}: EditPostDialogProps) {
  const { data: session } = useSession()
  const supabase = createSupabaseClient()
  const { toast } = useToast()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && post) {
      setContent(post.content || "")
    }
  }, [open, post])

  const handleSave = async () => {
    if (!session?.user?.id || !post) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          content: content.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .eq("author_id", session.user.id)

      if (error) throw error

      toast({
        title: "Post aggiornato",
        description: "Il post è stato modificato con successo",
      })

      onOpenChange(false)
      if (onPostUpdated) {
        onPostUpdated()
      }
    } catch (error: any) {
      console.error("Error updating post:", error)
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare il post",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md md:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Modifica Post</DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Modifica il contenuto del tuo post. Le immagini non possono essere modificate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi qualcosa..."
              rows={6}
              className="resize-none text-sm md:text-base min-h-[120px] md:min-h-[150px]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto touch-manipulation"
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !content.trim()}
              className="w-full sm:w-auto touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva modifiche"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}



