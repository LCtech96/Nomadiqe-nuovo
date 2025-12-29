"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Check, X } from "lucide-react"

interface BookingRequestActionsProps {
  messageId: string
  bookingData: {
    property_id: string
    property_name: string
    check_in: string
    check_out: string
    guests: number
    total_price: number
    nights: number
  }
  onAccepted?: () => void
  onRejected?: () => void
}

export function BookingRequestActions({
  messageId,
  bookingData,
  onAccepted,
  onRejected,
}: BookingRequestActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showIbanDialog, setShowIbanDialog] = useState(false)
  const [iban, setIban] = useState("")

  const handleAccept = async () => {
    if (iban.trim()) {
      setShowIbanDialog(true)
    } else {
      await acceptBooking()
    }
  }

  const acceptBooking = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/bookings/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, iban: iban.trim() || null }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'accettazione della prenotazione")
      }

      toast({
        title: "Prenotazione accettata!",
        description: "La prenotazione è stata creata e il viaggiatore è stato notificato.",
      })

      setShowIbanDialog(false)
      setIban("")
      onAccepted?.()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile accettare la prenotazione",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm("Sei sicuro di voler rifiutare questa prenotazione?")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel rifiuto della prenotazione")
      }

      toast({
        title: "Prenotazione rifiutata",
        description: "Il viaggiatore è stato notificato.",
      })

      onRejected?.()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare la prenotazione",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-1" />
          Accetta
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={loading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Rifiuta
        </Button>
      </div>

      <Dialog open={showIbanDialog} onOpenChange={setShowIbanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inserisci IBAN per il pagamento</DialogTitle>
            <DialogDescription>
              L'IBAN verrà inviato al viaggiatore per completare il pagamento della prenotazione.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="IT60X0542811101000000123456"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Dettagli prenotazione:</p>
              <p>Check-in: {new Date(bookingData.check_in).toLocaleDateString("it-IT")}</p>
              <p>Check-out: {new Date(bookingData.check_out).toLocaleDateString("it-IT")}</p>
              <p>Totale: €{bookingData.total_price.toFixed(2)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIbanDialog(false)}>
              Annulla
            </Button>
            <Button onClick={acceptBooking} disabled={loading || !iban.trim()}>
              Conferma e invia IBAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

