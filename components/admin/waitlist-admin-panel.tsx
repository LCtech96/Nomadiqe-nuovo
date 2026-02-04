"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"

type WaitlistRequest = {
  id: string
  full_name: string
  email: string
  username: string
  phone_number: string
  role: string
  created_at: string
}

const roleLabel = (role: string) => {
  switch (role) {
    case "host":
      return "Host"
    case "creator":
      return "Creator"
    case "traveler":
      return "Traveler"
    case "jolly":
      return "Jolly"
    default:
      return role
  }
}

export default function WaitlistAdminPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<WaitlistRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedForEmail, setSelectedForEmail] = useState<WaitlistRequest | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/waitlist/pending")
      if (!response.ok) {
        throw new Error("Impossibile caricare le richieste")
      }
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Errore nel caricamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const openEmailDialog = (request: WaitlistRequest) => {
    setSelectedForEmail(request)
    setEmailSubject("Nomadiqe — Aggiornamento sulla tua richiesta")
    setEmailBody("Ciao,\n\nTi scriviamo per aggiornarti sulla tua richiesta di accesso alla waitlist Nomadiqe.\n\nA presto,\nIl Team Nomadiqe")
    setEmailDialogOpen(true)
  }

  const handleSendEmail = async () => {
    if (!selectedForEmail) return
    setSendingEmail(true)
    try {
      const response = await fetch("/api/admin/waitlist/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedForEmail.email,
          subject: emailSubject,
          body: emailBody,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Errore durante l'invio")
      }
      toast({ title: "Email inviata", description: `Inviata a ${selectedForEmail.email}` })
      setEmailDialogOpen(false)
      setSelectedForEmail(null)
    } catch (error: unknown) {
      toast({
        title: "Errore",
        description: (error as Error)?.message || "Errore durante l'invio",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const response = await fetch("/api/admin/waitlist/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || "Errore durante l'approvazione")
      }

      setRequests((prev) => prev.filter((item) => item.id !== id))
      toast({
        title: "Approvato",
        description: "Email inviata con successo",
      })
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error?.message || "Errore durante l'approvazione",
        variant: "destructive",
      })
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Caricamento...</div>
  }

  if (!requests.length) {
    return <div className="py-10 text-center text-muted-foreground">Nessuna richiesta in attesa.</div>
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Ruolo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.full_name}</TableCell>
              <TableCell>{request.email}</TableCell>
              <TableCell>{request.username}</TableCell>
              <TableCell>{request.phone_number}</TableCell>
              <TableCell>{roleLabel(request.role)}</TableCell>
              <TableCell>
                {new Date(request.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEmailDialog(request)}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email personalizzata
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={approvingId === request.id}
                >
                  {approvingId === request.id ? "Approvazione..." : "Approva"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invia email a {selectedForEmail?.email}</DialogTitle>
            <DialogDescription>
              Scrivi un&apos;email personalizzata. Il testo verrà formattato (a capo = nuova riga).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Oggetto</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Oggetto email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Corpo</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Scrivi qui il messaggio..."
                rows={8}
                className="resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? "Invio..." : "Invia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
