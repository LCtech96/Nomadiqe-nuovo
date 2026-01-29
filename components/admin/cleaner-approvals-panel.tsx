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
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

type CleanerApprovalRequest = {
  id: string
  cleaner_user_id: string
  status: string
  requested_at: string
  created_at: string
  full_name: string | null
  email: string | null
  years_experience: number | null
  insurance_status: string | null
  agreement_url: string | null
}

export default function CleanerApprovalsPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<CleanerApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/cleaner-approvals")
      if (!res.ok) throw new Error("Impossibile caricare le richieste")
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e?.message || "Errore nel caricamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (id: string) => {
    setActingId(id)
    try {
      const res = await fetch("/api/admin/cleaner-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, action: "approve" }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Errore durante l'approvazione")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast({
        title: "Approvato",
        description: body.cleaner_id ? `Cleaner ID: ${body.cleaner_id}` : "Cleaner approvato.",
      })
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e?.message || "Errore durante l'approvazione",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (id: string, reason?: string) => {
    setActingId(id)
    setRejectModal(null)
    setRejectionReason("")
    try {
      const res = await fetch("/api/admin/cleaner-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          action: "reject",
          rejectionReason: reason || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Errore durante il rifiuto")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast({ title: "Rifiutato", description: "Richiesta rifiutata." })
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e?.message || "Errore durante il rifiuto",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento richieste Cleaner...
      </div>
    )
  }

  if (!requests.length) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Nessuna richiesta di approvazione Cleaner in attesa.
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Richieste Cleaner in attesa</CardTitle>
          <CardDescription>
            Approva o rifiuta le richieste. Solo i Cleaner approvati possono accettare ordini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Esperienza</TableHead>
                <TableHead>Assicurazione</TableHead>
                <TableHead>Accordo</TableHead>
                <TableHead>Data richiesta</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.full_name ?? "—"}</TableCell>
                  <TableCell>{r.email ?? "—"}</TableCell>
                  <TableCell>
                    {r.years_experience != null ? `${r.years_experience} anni` : "—"}
                  </TableCell>
                  <TableCell>{r.insurance_status ?? "—"}</TableCell>
                  <TableCell>
                    {r.agreement_url ? (
                      <a
                        href={r.agreement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Apri
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(r.requested_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r.id)}
                      disabled={!!actingId}
                    >
                      {actingId === r.id ? "..." : "Approva"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectModal({ id: r.id })}
                      disabled={!!actingId}
                    >
                      Rifiuta
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectModal} onOpenChange={(open) => !open && setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiutare richiesta Cleaner</DialogTitle>
            <DialogDescription>
              Opzionale: indica un motivo del rifiuto (visibile al Cleaner).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo (opzionale)</Label>
            <Input
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Es. documentazione incompleta"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectModal && handleReject(rejectModal.id, rejectionReason)}
            >
              Rifiuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
