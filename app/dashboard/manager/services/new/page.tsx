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
  "supplier",
  "pharmacist",
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
  supplier: "Fornitore",
  pharmacist: "Farmacista in zona",
}

// Competenze predefinite per gestione proprietà
const PROPERTY_MANAGEMENT_SKILLS = [
  "Gestione prenotazioni",
  "Pulizie e manutenzione",
  "Check-in/Check-out",
  "Comunicazione ospiti",
  "Marketing e promozione",
  "Contabilità e fatturazione",
  "Gestione emergenze",
  "Rapporti con fornitori",
  "Manutenzione preventiva",
  "Gestione recensioni",
] as const

// Tipi di vettura per autista
const VEHICLE_TYPES = [
  "Auto",
  "Furgone",
  "Minivan",
  "SUV",
  "Motocicletta",
  "Bicicletta",
] as const

// Opzioni distanza per autista
const DISTANCE_OPTIONS = [
  "< 50 km",
  "50-100 km",
  "100-200 km",
  "> 200 km",
] as const

export default function NewServicePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    service_type: "cleaning" as typeof SERVICE_TYPES[number],
    title: "",
    description: "",
    price_per_hour: "",
    price_per_service: "",
    percentage_commission: "", // Per gestione proprietà
    price_per_route: {} as Record<string, string>, // Per autista
    vehicle_type: "", // Per autista
    availability_type: "flexible" as "flexible" | "seasonal" | "full-time",
    operating_cities: [] as string[],
    operating_countries: [] as string[],
    skills: [] as string[], // Competenze ordinate per gestione proprietà
    // Campi per luogo e orari (farmacista e altri servizi con luogo fisico)
    location_address: "",
    location_city: "",
    location_country: "",
    location_latitude: "",
    location_longitude: "",
    operating_hours: {} as Record<string, { open: string; close: string; closed: boolean }>,
  })

  const [currentCity, setCurrentCity] = useState("")
  const [currentCountry, setCurrentCountry] = useState("")
  const [currentSkill, setCurrentSkill] = useState("")

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
      // Prepara i dati in base al tipo di servizio
      const insertData: any = {
        manager_id: session.user.id,
        service_type: formData.service_type,
        title: formData.title,
        description: formData.description,
        availability_type: formData.availability_type,
        operating_cities: formData.operating_cities,
        operating_countries: formData.operating_countries,
        skills: formData.skills,
        portfolio_images: [],
      }

      // Campi specifici per tipo di servizio
      if (formData.service_type === "property_management") {
        // Gestione proprietà: usa percentuale commissione, no prezzi
        insertData.percentage_commission = formData.percentage_commission
          ? parseFloat(formData.percentage_commission)
          : null
        insertData.price_per_hour = null
        insertData.price_per_service = null
      } else if (formData.service_type === "driver") {
        // Autista: usa prezzo per tratta e tipo vettura
        const pricePerRoute: Record<string, number> = {}
        Object.entries(formData.price_per_route).forEach(([key, value]) => {
          if (value && !isNaN(parseFloat(value))) {
            pricePerRoute[key] = parseFloat(value)
          }
        })
        insertData.price_per_route = Object.keys(pricePerRoute).length > 0 ? pricePerRoute : null
        insertData.vehicle_type = formData.vehicle_type || null
        insertData.price_per_hour = null
        insertData.price_per_service = null
      } else if (formData.service_type === "supplier") {
        // Fornitore: non usa prezzi standard, usa catalogo prodotti
        insertData.price_per_hour = null
        insertData.price_per_service = null
      } else if (formData.service_type === "pharmacist") {
        // Farmacista: non usa prezzi standard, usa catalogo prodotti
        insertData.price_per_hour = null
        insertData.price_per_service = null
      } else {
        // Altri servizi: usa i campi standard
        insertData.price_per_hour = formData.price_per_hour ? parseFloat(formData.price_per_hour) : null
        insertData.price_per_service = formData.price_per_service
          ? parseFloat(formData.price_per_service)
          : null
      }

      // Aggiungi campi per luogo e orari se presenti
      if (formData.location_address || formData.location_city || formData.location_country) {
        insertData.location_address = formData.location_address || null
        insertData.location_city = formData.location_city || null
        insertData.location_country = formData.location_country || null
        insertData.location_latitude = formData.location_latitude ? parseFloat(formData.location_latitude) : null
        insertData.location_longitude = formData.location_longitude ? parseFloat(formData.location_longitude) : null
      }

      if (Object.keys(formData.operating_hours).length > 0) {
        insertData.operating_hours = formData.operating_hours
      }

      const { data, error } = await supabase
        .from("manager_services")
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Successo",
        description: "Servizio creato con successo!",
      })

      // Se è un servizio fornitore o farmacista, reindirizza alla pagina catalogo
      if (formData.service_type === "supplier" || formData.service_type === "pharmacist") {
        router.push(`/dashboard/jolly/services/${data.id}/catalog`)
      } else {
        router.push(`/dashboard/jolly/services/${data.id}`)
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

  // Gestione competenze predefinite per gestione proprietà
  const togglePropertyManagementSkill = (skill: string) => {
    if (formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: formData.skills.filter((s) => s !== skill),
      })
    } else {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill],
      })
    }
  }

  const moveSkill = (index: number, direction: "up" | "down") => {
    const newSkills = [...formData.skills]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < newSkills.length) {
      [newSkills[index], newSkills[newIndex]] = [newSkills[newIndex], newSkills[index]]
      setFormData({ ...formData, skills: newSkills })
    }
  }

  const updatePricePerRoute = (distance: string, price: string) => {
    setFormData({
      ...formData,
      price_per_route: {
        ...formData.price_per_route,
        [distance]: price,
      },
    })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nuovo servizio</h1>
          <p className="text-muted-foreground">Aggiungi un nuovo servizio al tuo portfolio</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni servizio</CardTitle>
            <CardDescription>Compila i dettagli del servizio che offri</CardDescription>
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
                  placeholder="Es. Servizio pulizie professionali"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descrivi il servizio che offri..."
                />
              </div>

              {/* Campi prezzo condizionali in base al tipo di servizio */}
              {formData.service_type === "property_management" ? (
                <div className="space-y-2">
                  <Label htmlFor="percentage_commission">Percentuale commissione richiesta idealmente (%)</Label>
                  <Input
                    id="percentage_commission"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentage_commission}
                    onChange={(e) => setFormData({ ...formData, percentage_commission: e.target.value })}
                    placeholder="Es. 15.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    Inserisci la percentuale di commissione che desideri per la gestione della proprietà
                  </p>
                </div>
              ) : formData.service_type === "driver" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo di vettura *</Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo di vettura" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prezzo per tratta (€)</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Inserisci il prezzo per ogni fascia di distanza
                    </p>
                    <div className="space-y-3">
                      {DISTANCE_OPTIONS.map((distance) => (
                        <div key={distance} className="flex items-center gap-3">
                          <Label className="w-32">{distance}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price_per_route[distance] || ""}
                            onChange={(e) => updatePricePerRoute(distance, e.target.value)}
                            placeholder="0.00"
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : formData.service_type === "supplier" || formData.service_type === "pharmacist" ? (
                <div className="space-y-2">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Dopo la creazione del servizio, potrai aggiungere i prodotti al catalogo.
                    </p>
                  </div>
                </div>
              ) : (
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
                      placeholder="0.00"
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
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

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

              {/* Campi per luogo e orari - per farmacista e supplier */}
              {(formData.service_type === "pharmacist" || formData.service_type === "supplier") && (
                <>
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Informazioni sul luogo</h3>
                    <div className="space-y-2">
                      <Label htmlFor="location_address">Indirizzo completo *</Label>
                      <Input
                        id="location_address"
                        value={formData.location_address}
                        onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                        placeholder="Es. Via Roma 123"
                        required={formData.service_type === "pharmacist"}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location_city">Città *</Label>
                        <Input
                          id="location_city"
                          value={formData.location_city}
                          onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                          placeholder="Es. Roma"
                          required={formData.service_type === "pharmacist"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location_country">Paese *</Label>
                        <Input
                          id="location_country"
                          value={formData.location_country}
                          onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                          placeholder="Es. Italia"
                          required={formData.service_type === "pharmacist"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orari operativi */}
                  {formData.service_type === "pharmacist" && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-semibold">Orari operativi</h3>
                      <div className="space-y-3">
                        {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                          const dayLabels: Record<string, string> = {
                            monday: "Lunedì",
                            tuesday: "Martedì",
                            wednesday: "Mercoledì",
                            thursday: "Giovedì",
                            friday: "Venerdì",
                            saturday: "Sabato",
                            sunday: "Domenica",
                          }
                          const dayData = formData.operating_hours[day] || { open: "09:00", close: "19:00", closed: false }
                          return (
                            <div key={day} className="flex items-center gap-4">
                              <div className="w-24">
                                <Label>{dayLabels[day]}</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!dayData.closed}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      operating_hours: {
                                        ...formData.operating_hours,
                                        [day]: { ...dayData, closed: !e.target.checked },
                                      },
                                    })
                                  }}
                                  className="w-4 h-4"
                                />
                                <Label className="text-sm">Aperto</Label>
                              </div>
                              {!dayData.closed && (
                                <>
                                  <Input
                                    type="time"
                                    value={dayData.open}
                                    onChange={(e) => {
                                      setFormData({
                                        ...formData,
                                        operating_hours: {
                                          ...formData.operating_hours,
                                          [day]: { ...dayData, open: e.target.value },
                                        },
                                      })
                                    }}
                                    className="w-32"
                                  />
                                  <span className="text-muted-foreground">-</span>
                                  <Input
                                    type="time"
                                    value={dayData.close}
                                    onChange={(e) => {
                                      setFormData({
                                        ...formData,
                                        operating_hours: {
                                          ...formData.operating_hours,
                                          [day]: { ...dayData, close: e.target.value },
                                        },
                                      })
                                    }}
                                    className="w-32"
                                  />
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Competenze - diverso per gestione proprietà */}
              {formData.service_type === "property_management" ? (
                <div className="space-y-2">
                  <Label>Competenze</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Seleziona e ordina le tue competenze (l'ordine è importante)
                  </p>
                  <div className="space-y-2">
                    {PROPERTY_MANAGEMENT_SKILLS.map((skill) => (
                      <div
                        key={skill}
                        className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted"
                        onClick={() => togglePropertyManagementSkill(skill)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(skill)}
                          onChange={() => togglePropertyManagementSkill(skill)}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{skill}</span>
                      </div>
                    ))}
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>Ordine competenze (trascina per riordinare)</Label>
                      <div className="space-y-2">
                        {formData.skills.map((skill, index) => (
                          <div
                            key={skill}
                            className="flex items-center gap-2 p-3 bg-secondary rounded-lg"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSkill(index, "up")}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSkill(index, "down")}
                              disabled={index === formData.skills.length - 1}
                            >
                              ↓
                            </Button>
                            <span className="flex-1">{index + 1}. {skill}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSkill(skill)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
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
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Salvataggio..." : "Crea servizio"}
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




