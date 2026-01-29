"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface RequestServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jollyId: string
  serviceId: string
  serviceTitle?: string
  onSuccess?: () => void
}

interface PropertyOption {
  id: string
  title: string | null
  name: string | null
  city?: string | null
}

export default function RequestServiceDialog({
  open,
  onOpenChange,
  jollyId,
  serviceId,
  serviceTitle,
  onSuccess,
}: RequestServiceDialogProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const supabase = createSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [propertyId, setPropertyId] = useState<string>("")
  const [requestedDate, setRequestedDate] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open || !session?.user?.id) return
    const load = async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, name, city")
        .eq("owner_id", session!.user!.id)
      setProperties((data as PropertyOption[]) || [])
      setPropertyId("")
      setRequestedDate("")
      setDescription("")
    }
    load()
  }, [open, session?.user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast({ title: "Errore", description: "Devi essere autenticato", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/service-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jollyId,
          serviceId,
          propertyId: propertyId && propertyId !== "__none__" ? propertyId : undefined,
          requestedDate: requestedDate || undefined,
          description: description.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || "Errore nella richiesta")
      }
      toast({ title: "Richiesta inviata", description: "Il Jolly riceverà la tua richiesta." })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Impossibile inviare la richiesta",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Richiedi servizio</DialogTitle>
          <DialogDescription>
            {serviceTitle ? `Richiesta per: ${serviceTitle}` : "Invia una richiesta di servizio al Jolly."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {properties.length > 0 && (
            <div>
              <Label>Proprietà (dove effettuare il servizio)</Label>
              <Select value={propertyId || "__none__"} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una struttura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuna</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || p.name || p.id.slice(0, 8)}
                      {p.city ? ` — ${p.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Data richiesta (opzionale)</Label>
            <Input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <Label>Note / descrizione (opzionale)</Label>
            <Textarea
              placeholder="Indica dettagli utili per il servizio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Invio..." : "Invia richiesta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
