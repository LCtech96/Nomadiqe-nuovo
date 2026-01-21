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
import Link from "next/link"

const SERVICE_TYPES = [
  "cleaning",
  "property_management",
  "photography",
  "videography",
  "social_media",
  "maintenance",
  "concierge",
  "cooking",
  "driver",
  "translation",
] as const

const SERVICE_TYPE_LABELS: Record<string, string> = {
  cleaning: "Pulizie",
  property_management: "Gestione proprietà",
  photography: "Fotografia",
  videography: "Video",
  social_media: "Social Media",
  maintenance: "Manutenzione",
  concierge: "Concierge",
  cooking: "Cucina",
  driver: "Autista",
  translation: "Traduzione",
}

export default function EditServicePage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    service_type: "cleaning" as typeof SERVICE_TYPES[number],
    title: "",
    description: "",
    price_per_hour: "",
    price_per_service: "",
    availability_type: "flexible" as "flexible" | "seasonal" | "full-time",
    operating_cities: [] as string[],
    operating_countries: [] as string[],
    skills: [] as string[],
    is_active: true,
  })

  const [currentCity, setCurrentCity] = useState("")
  const [currentCountry, setCurrentCountry] = useState("")
  const [currentSkill, setCurrentSkill] = useState("")

  useEffect(() => {
    if (params.id) {
      loadService()
    }
  }, [params.id])

  const loadService = async () => {
    try {
      const { data, error } = await supabase
        .from("manager_services")
        .select("*")
        .eq("id", params.id)
        .eq("manager_id", session?.user.id)
        .single()

      if (error) throw error

      setFormData({
        service_type: data.service_type || "cleaning",
        title: data.title || "",
        description: data.description || "",
        price_per_hour: data.price_per_hour?.toString() || "",
        price_per_service: data.price_per_service?.toString() || "",
        availability_type: data.availability_type || "flexible",
        operating_cities: data.operating_cities || [],
        operating_countries: data.operating_countries || [],
        skills: data.skills || [],
        is_active: data.is_active ?? true,
      })
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare il servizio",
        variant: "destructive",
      })
      router.push("/dashboard/jolly")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from("manager_services")
        .update({
          service_type: formData.service_type,
          title: formData.title,
          description: formData.description,
          price_per_hour: formData.price_per_hour ? parseFloat(formData.price_per_hour) : null,
          price_per_service: formData.price_per_service
            ? parseFloat(formData.price_per_service)
            : null,
          availability_type: formData.availability_type,
          operating_cities: formData.operating_cities,
          operating_countries: formData.operating_countries,
          skills: formData.skills,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Successo",
        description: "Servizio aggiornato con successo!",
      })

      router.push("/dashboard/jolly")
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

  const addCity = () => {
    if (currentCity.trim() && !formData.operating_cities.includes(currentCity.trim())) {
      setFormData({
        ...formData,
        operating_cities: [...formData.operating_cities, currentCity.trim()],
      })
      setCurrentCity("")
    }
  }

  const removeCity = (city: string) => {
    setFormData({
      ...formData,
      operating_cities: formData.operating_cities.filter((c) => c !== city),
    })
  }

  const addCountry = () => {
    if (currentCountry.trim() && !formData.operating_countries.includes(currentCountry.trim())) {
      setFormData({
        ...formData,
        operating_countries: [...formData.operating_countries, currentCountry.trim()],
      })
      setCurrentCountry("")
    }
  }

  const removeCountry = (country: string) => {
    setFormData({
      ...formData,
      operating_countries: formData.operating_countries.filter((c) => c !== country),
    })
  }

  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, currentSkill.trim()],
      })
      setCurrentSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
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
            <h1 className="text-3xl font-bold mb-2">Modifica servizio</h1>
            <p className="text-muted-foreground">Aggiorna i dettagli del tuo servizio</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/jolly">Torna alla dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni servizio</CardTitle>
            <CardDescription>Modifica i dettagli del servizio</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_type">Tipo servizio *</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, service_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {SERVICE_TYPE_LABELS[type] || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability_type">Disponibilità</Label>
                  <Select
                    value={formData.availability_type}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, availability_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flessibile</SelectItem>
                      <SelectItem value="seasonal">Stagionale</SelectItem>
                      <SelectItem value="full-time">Tempo pieno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titolo servizio *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  <Label htmlFor="price_per_hour">Prezzo per ora (€)</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_service">Prezzo per servizio (€)</Label>
                  <Input
                    id="price_per_service"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_service}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_service: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cities">Città di operazione</Label>
                <div className="flex gap-2">
                  <Input
                    id="cities"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCity()
                      }
                    }}
                    placeholder="Aggiungi una città"
                  />
                  <Button type="button" onClick={addCity}>
                    Aggiungi
                  </Button>
                </div>
                {formData.operating_cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.operating_cities.map((city) => (
                      <span
                        key={city}
                        className="px-3 py-1 bg-secondary rounded-full text-sm flex items-center gap-2"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => removeCity(city)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="countries">Paesi di operazione</Label>
                <div className="flex gap-2">
                  <Input
                    id="countries"
                    value={currentCountry}
                    onChange={(e) => setCurrentCountry(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCountry()
                      }
                    }}
                    placeholder="Aggiungi un paese"
                  />
                  <Button type="button" onClick={addCountry}>
                    Aggiungi
                  </Button>
                </div>
                {formData.operating_countries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.operating_countries.map((country) => (
                      <span
                        key={country}
                        className="px-3 py-1 bg-secondary rounded-full text-sm flex items-center gap-2"
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => removeCountry(country)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Competenze</Label>
                <div className="flex gap-2">
                  <Input
                    id="skills"
                    value={currentSkill}
                    onChange={(e) => setCurrentSkill(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="Aggiungi una competenza"
                  />
                  <Button type="button" onClick={addSkill}>
                    Aggiungi
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-secondary rounded-full text-sm flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
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
                <Label htmlFor="is_active">Servizio attivo</Label>
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






