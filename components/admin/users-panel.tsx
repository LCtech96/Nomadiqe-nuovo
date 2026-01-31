"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Mail } from "lucide-react"

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  role: string | null
  host_level: string | null
  creator_level: string | null
  structure_level: number | null
  created_at: string | null
}

export default function UsersPanel() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [emailTarget, setEmailTarget] = useState<UserRow | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Impossibile caricare gli utenti")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Errore nel caricamento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openEmailDialog = (u: UserRow) => {
    setEmailTarget(u)
    setEmailSubject("")
    setEmailMessage("")
  }

  const handleSendEmail = async () => {
    if (!emailTarget?.id || !emailSubject.trim() || !emailMessage.trim()) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: emailTarget.id,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Errore nell'invio")
      setEmailTarget(null)
      toast({ title: "Email inviata", description: `Messaggio inviato a ${emailTarget.email || "l'utente"}.` })
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile inviare l'email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleStructureLevelChange = async (userId: string, value: string) => {
    setUpdatingId(userId)
    try {
      const level = value === "none" ? null : parseInt(value, 10)
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, structureLevel: level }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Errore")
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, structure_level: level } : u))
      )
      toast({ title: "Aggiornato", description: "Livello struttura salvato." })
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Errore durante il salvataggio",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento utenti...
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utenti registrati</CardTitle>
        <CardDescription>
          Lista utenti per ruolo. Per gli host puoi impostare il livello struttura (1-4). Clicca &quot;Invia email&quot; per inviare un messaggio a un utente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {u.full_name || u.username || u.email || u.id}
                  </p>
                  {u.username && (
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                  )}
                  <p className="text-xs text-muted-foreground capitalize">
                    Ruolo: {u.role || "—"}
                    {u.role === "host" && u.host_level && ` · ${u.host_level}`}
                    {u.role === "creator" && u.creator_level && ` · ${u.creator_level}`}
                  </p>
                </div>
              </div>
              {u.role === "host" && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">Struttura:</span>
                  <Select
                    value={u.structure_level != null ? String(u.structure_level) : "none"}
                    onValueChange={(v) => handleStructureLevelChange(u.id, v)}
                    disabled={!!updatingId}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="1">1 level</SelectItem>
                      <SelectItem value="2">2 level</SelectItem>
                      <SelectItem value="3">3 level</SelectItem>
                      <SelectItem value="4">4 level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEmailDialog(u)}
                disabled={!u.email}
                title={u.email ? "Invia email" : "Utente senza email"}
              >
                <Mail className="w-4 h-4 mr-1" />
                Invia email
              </Button>
            </div>
          ))}
        </div>
        {users.length === 0 && (
          <p className="text-center text-muted-foreground py-6">Nessun utente trovato.</p>
        )}
      </CardContent>

      <Dialog open={!!emailTarget} onOpenChange={(open) => !open && setEmailTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invia email</DialogTitle>
            <DialogDescription>
              Scrivi un messaggio da inviare a {emailTarget?.full_name || emailTarget?.username || "l'utente"} ({emailTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email-subject">Oggetto</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Oggetto dell'email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email-message">Messaggio</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Scrivi il messaggio..."
                rows={6}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTarget(null)}>
              Annulla
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailSubject.trim() || !emailMessage.trim()}>
              {sendingEmail ? "Invio in corso..." : "Invia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
