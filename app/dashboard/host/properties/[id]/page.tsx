"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
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
import Link from "next/link"
import { X } from "lucide-react"

export default function EditPropertyPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    is_active: true,
  })

  const [currentAmenity, setCurrentAmenity] = useState("")

  useEffect(() => {
    if (params.id) {
      loadProperty()
    }
  }, [params.id])

  const loadProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .eq("owner_id", session?.user.id)
        .single()

      if (error) {
        // Only log non-expected errors (not "not found" errors)
        if (error.code !== "PGRST116" && error.code !== "PGRST301" && !error.message?.includes("406")) {
          console.error("Error loading property:", error)
        }
        // If property not found, redirect to dashboard
        if (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("406")) {
          router.push("/dashboard/host")
          return
        }
        throw error
      }

      if (!data) {
        router.push("/dashboard/host")
        return
      }

      setFormData({
        name: data.name || "",
        description: data.description || "",
        property_type: data.property_type || "apartment",
        address: data.address || "",
        city: data.city || "",
        country: data.country || "",
        price_per_night: data.price_per_night?.toString() || "",
        max_guests: data.max_guests?.toString() || "",
        bedrooms: data.bedrooms?.toString() || "",
        bathrooms: data.bathrooms?.toString() || "",
        amenities: data.amenities || [],
        is_active: data.is_active ?? true,
      })
    } catch (error: any) {
      // Only log if it's not a "not found" error
      if (error?.code !== "PGRST116" && error?.code !== "PGRST301" && !error?.message?.includes("406")) {
        console.error("Error loading property:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare la proprietà",
          variant: "destructive",
        })
      }
      router.push("/dashboard/host")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Geocode address if changed
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.country}`
      const geocodeResult = await geocodeAddress(fullAddress)

      const { error } = await supabase
        .from("properties")
        .update({
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
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          amenities: formData.amenities,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Proprietà aggiornata con successo!",
      })

      router.push("/dashboard/host")
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Modifica struttura</h1>
            <p className="text-muted-foreground">Aggiorna i dettagli della tua proprietà</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/host">Torna alla dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni base</CardTitle>
            <CardDescription>Modifica i dettagli della tua struttura</CardDescription>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
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
                <p className="text-sm text-muted-foreground mb-2">
                  Seleziona i servizi disponibili nella tua struttura
                </p>
                
                {/* Servizi selezionati */}
                {formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm flex items-center gap-2"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="hover:bg-primary/80 rounded-full p-0.5"
                          disabled={saving}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Servizi predefiniti */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Servizi comuni:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableAmenities
                      .filter((amenity) => !formData.amenities.includes(amenity))
                      .map((amenity) => (
                        <Button
                          key={amenity}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!formData.amenities.includes(amenity)) {
                              setFormData({
                                ...formData,
                                amenities: [...formData.amenities, amenity],
                              })
                            }
                          }}
                          disabled={saving}
                        >
                          {amenity}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Input per servizi personalizzati */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Aggiungi servizio personalizzato:</p>
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
                      placeholder="Es: WiFi veloce, Piscina riscaldata..."
                    />
                    <Button type="button" onClick={addAmenity} disabled={saving}>
                      Aggiungi
                    </Button>
                  </div>
                </div>

                {formData.amenities.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nessun servizio selezionato
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">Proprietà attiva (visibile nel marketplace)</Label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
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

