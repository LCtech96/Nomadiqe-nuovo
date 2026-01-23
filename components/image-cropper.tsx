"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import imageCompression from "browser-image-compression"

interface ImageCropperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageFile: File | null
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number | null // null = ritaglio libero
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export default function ImageCropper({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
  aspectRatio = null, // null = ritaglio libero (altezza e larghezza)
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(imageFile)
    } else {
      setImageSrc(null)
    }
  }, [imageFile])

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

    canvas.width = safeArea
    canvas.height = safeArea

    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.translate(-safeArea / 2, -safeArea / 2)

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    )

    const data = ctx.getImageData(0, 0, safeArea, safeArea)

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        }
      }, "image/jpeg", quality)
    })
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setLoading(true)
    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      
      // Optimize and compress the image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: Math.max(maxWidth, maxHeight),
        useWebWorker: true,
        fileType: "image/jpeg",
      }

      const compressedFile = await imageCompression(
        new File([croppedBlob], imageFile?.name || "image.jpg", {
          type: "image/jpeg",
        }),
        options
      )

      onCropComplete(compressedFile)
      onOpenChange(false)
      
      // Reset state
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    } catch (error) {
      console.error("Error cropping image:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ritaglia e ottimizza immagine</DialogTitle>
          <DialogDescription>
            {aspectRatio === null 
              ? "Trascina l'immagine per posizionarla e regola lo zoom. Puoi ritagliare liberamente in altezza e larghezza."
              : "Regola l'immagine trascinando e usando lo zoom, poi clicca su Salva"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio === null ? undefined : aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              cropShape={aspectRatio === null ? "rect" : "rect"}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>
          {aspectRatio === null && (
            <div className="text-sm text-muted-foreground">
              💡 Puoi trascinare l'immagine per posizionarla e ritagliare liberamente in qualsiasi dimensione
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={loading || !croppedAreaPixels}>
            {loading ? "Elaborazione..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
