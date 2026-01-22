"use client"

import { useState, useEffect } from "react"
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
import { ImageIcon, X, VideoIcon, Loader2 } from "lucide-react"
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

  // Load user role on mount
  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserRole(data.role)
        })
    }
  }, [session?.user?.id, supabase])
  const [content, setContent] = useState("")
  const [location, setLocation] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [showCropper, setShowCropper] = useState(false)
  const [fileToCrop, setFileToCrop] = useState<File | null>(null)
  const [cropIndex, setCropIndex] = useState<number>(-1)
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

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

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verifica dimensione (max 100MB)
    const maxSizeMB = 100
    const fileSizeMB = file.size / (1024 * 1024)
    
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "Errore",
        description: `Il video è troppo grande. Dimensione massima consentita: ${maxSizeMB}MB. Dimensione attuale: ${fileSizeMB.toFixed(2)}MB. Scegli un video più leggero.`,
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    // Verifica tipo file (solo video)
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Errore",
        description: "Seleziona un file video valido",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    // Verifica limite giornaliero
    try {
      const response = await fetch("/api/video/check-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadType: "post" }),
      })

      const { canUpload, error } = await response.json()

      if (!canUpload) {
        toast({
          title: "Limite raggiunto",
          description: error || "Hai già caricato un video oggi. Limite: 1 video al giorno per tipo.",
          variant: "destructive",
        })
        e.target.value = ""
        return
      }
    } catch (error) {
      console.error("Error checking video limit:", error)
      toast({
        title: "Errore",
        description: "Impossibile verificare il limite video. Riprova.",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    setVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setVideo(null)
    setVideoPreview(null)
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

    if (!content.trim() && images.length === 0 && !video) {
      toast({
        title: "Errore",
        description: "Inserisci almeno un testo, un'immagine o un video",
        variant: "destructive",
      })
      return
    }

    // Se c'è un video, non possono esserci immagini
    if (video && images.length > 0) {
      toast({
        title: "Errore",
        description: "Non puoi caricare sia immagini che video nello stesso post. Scegli uno dei due.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Upload video or images
      let videoUrl: string | null = null
      const imageUrls: string[] = []
      const blobToken = process.env.NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

      // Upload video if present (only for creators)
      if (video && userRole === "creator" && blobToken) {
        setUploadingVideo(true)
        try {
          const fileExtension = video.name.split(".").pop()
          const fileName = `${session.user.id}/posts/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`
          const blob = await put(fileName, video, {
            access: "public",
            contentType: video.type,
            token: blobToken,
          })
          videoUrl = blob.url

          // Record video upload
          const fileSizeMB = video.size / (1024 * 1024)
          const recordResponse = await fetch("/api/video/record-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadType: "post",
              videoUrl: blob.url,
              fileSizeMb: fileSizeMB,
            }),
          })

          if (!recordResponse.ok) {
            const { error } = await recordResponse.json()
            throw new Error(error || "Errore nella registrazione del video")
          }
        } catch (uploadError: any) {
          console.error("Video upload error:", uploadError)
          toast({
            title: "Errore",
            description: uploadError.message || "Impossibile caricare il video",
            variant: "destructive",
          })
          setUploadingVideo(false)
          setLoading(false)
          return
        } finally {
          setUploadingVideo(false)
        }
      }

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
      // Il database usa author_id, images (array) e video_url
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: session.user.id,
          content: content.trim() || null,
          images: imageUrls.length > 0 ? imageUrls : null, // Array di immagini
          video_url: videoUrl || null, // URL del video (solo per creator)
        })
        .select()
        .single()

      if (error) throw error

      // Award points for creating post
      // Note: Database triggers may also award points, but we update the 'points' column here
      // for frontend display consistency
      try {
        const { awardPoints } = await import("@/lib/points")
        await awardPoints(session.user.id, "post", "Post creato")
      } catch (pointsError) {
        // Ignora errori se il sistema punti non è disponibile
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
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
      setVideo(null)
      setVideoPreview(null)
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

          {/* Video upload (solo per creator) */}
          {userRole === "creator" && (
            <div className="space-y-2">
              <Label htmlFor="video">Aggiungi video (max 100MB, 1 al giorno)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="flex-1"
                  disabled={!!video || uploadingVideo || loading}
                />
                <VideoIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              {uploadingVideo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Caricamento video in corso...
                </div>
              )}
              {videoPreview && (
                <div className="relative mt-2">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full rounded-lg max-h-64"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 bg-destructive text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dimensione: {(video.size / (1024 * 1024)).toFixed(2)}MB
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Limite: 1 video al giorno. Dimensione massima: 100MB.
              </p>
            </div>
          )}

          {/* Image upload (non disponibile se c'è un video) */}
          {!video && (
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
          )}

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

