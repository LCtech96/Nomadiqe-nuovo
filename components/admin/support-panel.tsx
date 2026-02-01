"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Send, X } from "lucide-react"

type Request = {
  id: string
  subject: string
  status: string
  user_id: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  message: string
  attachment_urls: string[]
  is_from_admin: boolean
  created_at: string
}

export default function SupportPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ request: Request & { user?: any }; messages: Message[] } | null>(null)
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string; username?: string; email?: string; role?: string }>>({})
  const [replyText, setReplyText] = useState("")
  const [closeAfterReply, setCloseAfterReply] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/support", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      setRequests(data.requests || [])
      const ids = [...new Set((data.requests || []).map((r: Request) => r.user_id))]
      if (ids.length > 0) {
        const profRes = await fetch(
          `/api/admin/support/profiles?ids=${encodeURIComponent(JSON.stringify(ids))}`,
          { credentials: "include" }
        )
        const profData = await profRes.json()
        setProfiles(profData.profiles || {})
      }
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile caricare",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/support/${id}`, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      setDetail(data)
      setReplyText("")
      setCloseAfterReply(false)
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile caricare",
        variant: "destructive",
      })
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/${detailId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: replyText.trim(), close: closeAfterReply }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({ title: "Inviato", description: "Risposta inviata." })
      setReplyText("")
      openDetail(detailId)
      load()
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile inviare",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const closeRequest = async () => {
    if (!detailId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/${detailId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: "", close: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({ title: "Chiusa", description: "Richiesta chiusa." })
      setDetailId(null)
      setDetail(null)
      load()
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Impossibile chiudere",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento richieste...
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Richieste assistenza</CardTitle>
          <CardDescription>
            Leggi i messaggi degli utenti (host, creator, jolly) e rispondi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nessuna richiesta.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => {
                const user = profiles[r.user_id]
                const userName = user?.full_name || user?.username || user?.email || r.user_id.slice(0, 8)
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium truncate max-w-xs">{r.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {userName} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === "open" ? "default" : "secondary"}>
                        {r.status === "open" ? "Aperta" : "Chiusa"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => (detailId === r.id ? setDetailId(null) : openDetail(r.id))}
                      >
                        {detailId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Dettaglio
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && (setDetailId(null), setDetail(null))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettaglio richiesta</DialogTitle>
            <DialogDescription>
              Leggi la conversazione e rispondi all&apos;utente.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded border p-3 bg-muted/50">
                <p className="font-medium">{detail.request?.subject}</p>
                <p className="text-sm text-muted-foreground">
                  Da: {profiles[detail.request?.user_id]?.full_name || profiles[detail.request?.user_id]?.username || profiles[detail.request?.user_id]?.email || detail.request?.user_id} ·{" "}
                  {profiles[detail.request?.user_id]?.role && (
                    <Badge variant="outline" className="mr-1">{profiles[detail.request?.user_id].role}</Badge>
                  )}
                  {new Date(detail.request?.created_at).toLocaleString("it-IT")}
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detail.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded p-3 text-sm ${
                      m.is_from_admin ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                    }`}
                  >
                    <p className="font-medium text-xs mb-1">{m.is_from_admin ? "Tu (Admin)" : "Utente"}</p>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    {m.attachment_urls?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.attachment_urls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={url}
                              alt={`Allegato ${i + 1}`}
                              className="h-20 w-20 object-cover rounded border"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleString("it-IT")}
                    </p>
                  </div>
                ))}
              </div>

              {detail.request?.status === "open" && (
                <form onSubmit={handleReply} className="space-y-2">
                  <Label>Risposta</Label>
                  <Textarea
                    placeholder="Scrivi la risposta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={closeAfterReply}
                        onChange={(e) => setCloseAfterReply(e.target.checked)}
                      />
                      Chiudi richiesta dopo l&apos;invio
                    </label>
                    <Button type="submit" disabled={sending || !replyText.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      {sending ? "Invio..." : "Invia risposta"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeRequest}
                      disabled={sending}
                    >
                      Chiudi senza rispondere
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
