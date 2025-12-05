"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { geocodeAddress } from "@/lib/geocoding"

export default function NewPropertyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    property_type: "apartment" as "apartment" | "house" | "b&b" | "hotel" | "villa" | "other",
    address: "",
    city: "",
    country: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
  })

  const [currentAmenity, setCurrentAmenity] = useState("")

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

    setLoading(true)
    try {
      // Geocode address
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)

      if (!geocodeResult) {
        toast({
          title: "Attenzione",
          description: "Impossibile geocodificare l'indirizzo. La proprietà verrà salvata senza coordinate.",
        })
      }

      const { data, error } = await supabase
        .from("properties")
        .insert({
          host_id: session.user.id,
          name: formData.name,
          description: formData.description,
          property_type: formData.property_type,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          latitude: geocodeResult?.lat || null,
          longitude: geocodeResult?.lon || null,
          price_per_night: parseFloat(formData.price_per_night),
          max_guests: parseInt(formData.max_guests),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          amenities: formData.amenities,
          images: [],
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Successo",
        description: "Proprietà creata con successo!",
      })

      router.push(`/dashboard/host/properties/${data.id}`)
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

  const addAmenity = () => {
    if (currentAmenity.trim() && !formData.amenities.includes(currentAmenity.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, currentAmenity.trim()],
      })
      setCurrentAmenity("")
    }
  }

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((a) => a !== amenity),
    })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nuova struttura</h1>
          <p className="text-muted-foreground">Aggiungi una nuova proprietà al tuo portfolio</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni base</CardTitle>
            <CardDescription>Compila i dettagli della tua struttura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome struttura *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Es. Appartamento nel centro di Roma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descrivi la tua struttura..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Tipo struttura *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, property_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Appartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="b&b">B&B</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_night">Prezzo per notte (€) *</Label>
                  <Input
                    id="price_per_night"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  placeholder="Via, numero civico"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Paese *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_guests">Ospiti massimi *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Camere da letto</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bagni</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Servizi</Label>
                <div className="flex gap-2">
                  <Input
                    id="amenities"
                    value={currentAmenity}
                    onChange={(e) => setCurrentAmenity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addAmenity()
                      }
                    }}
                    placeholder="Aggiungi un servizio (es. WiFi, Parcheggio)"
                  />
                  <Button type="button" onClick={addAmenity}>
                    Aggiungi
                  </Button>
                </div>
                {formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 bg-secondary rounded-full text-sm flex items-center gap-2"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Salvataggio..." : "Crea struttura"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

