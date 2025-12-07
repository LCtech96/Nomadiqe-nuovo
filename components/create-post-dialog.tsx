"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { put } from "@vercel/blob"
import { ImageIcon, X } from "lucide-react"
import Image from "next/image"

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreatePostDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePostDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState("")
  const [location, setLocation] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      toast({
        title: "Errore",
        description: "Puoi caricare massimo 5 immagini",
        variant: "destructive",
      })
      return
    }

    const newFiles = files.filter((file) => file.size <= 5 * 1024 * 1024)
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file))

    setImages([...images, ...newFiles])
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato",
        variant: "destructive",
      })
      return
    }

    if (!content.trim() && images.length === 0) {
      toast({
        title: "Errore",
        description: "Inserisci almeno un testo o un'immagine",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Upload images
      const imageUrls: string[] = []
      const blobToken = process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

      if (images.length > 0 && blobToken) {
        for (const image of images) {
          try {
            const fileExtension = image.name.split(".").pop()
            const fileName = `${session.user.id}/posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
            const blob = await put(fileName, image, {
              access: "public",
              contentType: image.type,
              token: blobToken,
            })
            imageUrls.push(blob.url)
          } catch (uploadError: any) {
            console.error("Image upload error:", uploadError)
            toast({
              title: "Attenzione",
              description: `Errore nel caricamento dell'immagine ${image.name}. Continuo con le altre.`,
              variant: "destructive",
            })
          }
        }
      } else if (images.length > 0 && !blobToken) {
        toast({
          title: "Errore",
          description: "Token Vercel Blob non configurato. Configura NEW_BLOB_READ_WRITE_TOKEN nelle variabili d'ambiente.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Create post - usando le colonne corrette del database
      // Il database usa creator_id (non author_id) e media_url (non images array)
      const { data, error } = await supabase
        .from("posts")
        .insert({
          creator_id: session.user.id,
          content: content.trim() || null,
          media_url: imageUrls.length > 0 ? imageUrls[0] : "", // media_url è TEXT, prendiamo la prima immagine
          location: location.trim() || null,
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

      // Reset form
      setContent("")
      setLocation("")
      setImages([])
      setImagePreviews([])
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea un nuovo post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Cosa vuoi condividere?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Dove sei? (opzionale)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Aggiungi foto (max 5)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="flex-1"
                disabled={images.length >= 5}
              />
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Pubblicazione..." : "Pubblica"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

