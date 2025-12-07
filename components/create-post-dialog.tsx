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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { put } from "@vercel/blob"
import { ImageIcon, X } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"

const ImageCropper = dynamic(() => import("@/components/image-cropper"), {
  ssr: false,
  loading: () => null,
})

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
  const [showCropper, setShowCropper] = useState(false)
  const [fileToCrop, setFileToCrop] = useState<File | null>(null)
  const [cropIndex, setCropIndex] = useState<number>(-1)

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

    // Filter files by size (max 10MB before cropping)
    const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024)
    
    if (validFiles.length === 0) {
      toast({
        title: "Errore",
        description: "Le immagini devono essere inferiori a 10MB",
        variant: "destructive",
      })
      return
    }

    // Open cropper for first file, queue others
    if (validFiles.length > 0) {
      setFileToCrop(validFiles[0])
      setCropIndex(images.length) // Index where this image will be added
      setShowCropper(true)
      
      // If there are more files, they'll be processed after cropping
      if (validFiles.length > 1) {
        // Store remaining files temporarily (you might want to use a queue)
        // For now, we'll just process one at a time
      }
    }
    
    // Reset input
    e.target.value = ""
  }

  const handleCropComplete = (croppedFile: File) => {
    const newPreview = URL.createObjectURL(croppedFile)
    
    if (cropIndex === -1) {
      // Adding new image
      setImages([...images, croppedFile])
      setImagePreviews([...imagePreviews, newPreview])
    } else {
      // Replacing existing image
      const newImages = [...images]
      const newPreviews = [...imagePreviews]
      newImages[cropIndex] = croppedFile
      newPreviews[cropIndex] = newPreview
      setImages(newImages)
      setImagePreviews(newPreviews)
    }
    
    setShowCropper(false)
    setFileToCrop(null)
    setCropIndex(-1)
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
      // Il database usa author_id e images (array)
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: session.user.id,
          content: content.trim() || null,
          images: imageUrls.length > 0 ? imageUrls : null, // Array di immagini
        })
        .select()
        .single()

      if (error) throw error

      // Award points for creating post (se la tabella esiste)
      try {
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
          .maybeSingle()

        if (profile) {
          await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) + 15 })
            .eq("id", session.user.id)
        }
      } catch (pointsError) {
        // Ignora errori se la tabella points_history non esiste
        console.warn("Could not award points:", pointsError)
      }

      toast({
        title: "Successo",
        description: "Post creato con successo!",
      })

      // Reset form
      setContent("")
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
          <DialogDescription>
            Condividi i tuoi momenti con la community. Il post sarà visibile a tutti gli utenti nel feed.
          </DialogDescription>
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
                      sizes="(max-width: 768px) 33vw, 150px"
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
      
      {/* Image Cropper */}
      <ImageCropper
        open={showCropper}
        onOpenChange={setShowCropper}
        imageFile={fileToCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={4/3}
        maxWidth={1920}
        maxHeight={1920}
        quality={0.85}
      />
    </Dialog>
  )
}

