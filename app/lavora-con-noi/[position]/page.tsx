"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"
import { put } from "@vercel/blob"

const positionNames: Record<string, string> = {
  "client-success-manager": "Client Success Manager",
  "sales": "Sales",
  "marketing": "Marketing",
  "cto": "CTO",
  "vp-business-development": "VP Business Development",
  "candidatura-spontanea": "Candidatura Spontanea"
}

const countryCodes = [
  { code: "+39", country: "🇮🇹 Italia" },
  { code: "+1", country: "🇺🇸 USA/Canada" },
  { code: "+44", country: "🇬🇧 Regno Unito" },
  { code: "+33", country: "🇫🇷 Francia" },
  { code: "+49", country: "🇩🇪 Germania" },
  { code: "+34", country: "🇪🇸 Spagna" },
  { code: "+31", country: "🇳🇱 Paesi Bassi" },
  { code: "+32", country: "🇧🇪 Belgio" },
  { code: "+41", country: "🇨🇭 Svizzera" },
  { code: "+43", country: "🇦🇹 Austria" },
  { code: "+7", country: "🇷🇺 Russia" },
  { code: "+86", country: "🇨🇳 Cina" },
  { code: "+81", country: "🇯🇵 Giappone" },
  { code: "+82", country: "🇰🇷 Corea del Sud" },
  { code: "+91", country: "🇮🇳 India" },
  { code: "+55", country: "🇧🇷 Brasile" },
  { code: "+61", country: "🇦🇺 Australia" },
  { code: "+971", country: "🇦🇪 Emirati Arabi" },
  { code: "+966", country: "🇸🇦 Arabia Saudita" },
  { code: "+27", country: "🇿🇦 Sudafrica" },
]

export default function JobApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const position = params.position as string
  const positionName = positionNames[position] || "Posizione"

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCountryCode: "+39",
    phoneNumber: "",
    description: "",
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let cvUrl = ""

      // Upload CV if provided
      if (cvFile) {
        try {
          const blobToken = process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN || 
                           process.env.NEW_BLOB_READ_WRITE_TOKEN || 
                           process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN || 
                           process.env.BLOB_READ_WRITE_TOKEN

          if (!blobToken) {
            throw new Error("Token Vercel Blob non configurato")
          }

          const fileName = `job-applications/${Date.now()}-${cvFile.name}`
          const blob = await put(fileName, cvFile, {
            access: "public",
            contentType: cvFile.type,
            token: blobToken,
          })
          cvUrl = blob.url
        } catch (uploadError: any) {
          console.error("CV upload error:", uploadError)
          toast({
            title: "Errore",
            description: "Errore nel caricamento del CV. Il form verrà inviato senza allegato.",
            variant: "destructive",
          })
        }
      }

      // Submit application
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: position === "candidatura-spontanea" ? "spontaneous" : position,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone_country_code: formData.phoneCountryCode,
          phone_number: formData.phoneNumber,
          description: formData.description,
          cv_url: cvUrl || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Errore nell'invio della candidatura")
      }

      toast({
        title: "Candidatura inviata!",
        description: "La tua candidatura è stata inviata con successo. Ti contatteremo a breve.",
      })

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneCountryCode: "+39",
        phoneNumber: "",
        description: "",
      })
      setCvFile(null)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/lavora-con-noi")
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'invio della candidatura.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Link href="/lavora-con-noi">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alle posizioni
          </Button>
        </Link>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-3xl">Candidati come {positionName}</CardTitle>
            <CardDescription>
              Compila il form qui sotto e invia la tua candidatura. Ti contatteremo il prima possibile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    placeholder="Mario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="mario.rossi@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numero di cellulare *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.code} {item.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                    placeholder="123456789"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Perché vuoi candidarti? *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  placeholder="Racconta perché sei interessato a questa posizione e cosa puoi portare a Nomadiqe..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">Curriculum Vitae (PDF)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {cvFile && (
                    <span className="text-sm text-muted-foreground">
                      {cvFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Carica il tuo CV in formato PDF (max 10MB)
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Invio in corso..." : "Invia candidatura"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

