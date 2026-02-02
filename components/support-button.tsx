"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { put } from "@vercel/blob"
import { HelpCircle, Send, Upload, RefreshCw } from "lucide-react"

const ALLOWED_ROLES = ["host", "creator", "jolly"]

export default function SupportButton() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [requests, setRequests] = useState<{ id: string; subject: string; status: string; created_at: string }[]>([])
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [requestDetail, setRequestDetail] = useState<{ request: any; messages: any[] } | null>(null)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return
    fetch("/api/support/role-check", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRole(d.role || null))
      .catch(() => setRole(null))
  }, [status, session?.user?.id])

  const loadRequests = () => {
    if (!session?.user?.id) return
    fetch("/api/support/requests", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []))
      .catch(() => setRequests([]))
  }

  useEffect(() => {
    if (open && session?.user?.id) loadRequests()
  }, [open, session?.user?.id])

  // Auto-refresh messaggi quando si visualizza una richiesta (per vedere risposte admin)
  useEffect(() => {
    if (!viewingId || !session?.user?.id) return
    const interval = setInterval(() => {
      fetch(`/api/support/requests/${viewingId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          setRequestDetail(d)
          setTimeout(scrollToBottom, 100)
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [viewingId, session?.user?.id])

  const loadDetail = (id: string) => {
    setViewingId(id)
    fetch(`/api/support/requests/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setRequestDetail(d)
        setTimeout(scrollToBottom, 150)
      })
      .catch(() => setRequestDetail(null))
    setReplyText("")
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || sending) return
    setSending(true)
    try {
      let attachmentUrls: string[] = []
      if (screenshotFiles.length > 0) {
        const token =
          process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN ||
          process.env.NEW_BLOB_READ_WRITE_TOKEN ||
          process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN ||
          process.env.BLOB_READ_WRITE_TOKEN
        if (token) {
          for (let i = 0; i < screenshotFiles.length; i++) {
            const f = screenshotFiles[i]
            const ext = f.name.split(".").pop() || "jpg"
            const blob = await put(`${session!.user!.id}/support-${Date.now()}-${i}.${ext}`, f, {
              access: "public",
              contentType: f.type,
              token: token as string,
            })
            attachmentUrls.push(blob.url)
          }
        }
      }

      const res = await fetch("/api/support/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), attachmentUrls }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({ title: "Inviato", description: "Richiesta di assistenza inviata." })
      setSubject("")
      setMessage("")
      setScreenshotFiles([])
      loadRequests()
      loadDetail(data.id)
    } catch (err: unknown) {
      toast({
        title: "Errore",
        description: (err as Error)?.message || "Impossibile inviare",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingId || !replyText.trim() || sending) return
    setSending(true)
    try {
      let attachmentUrls: string[] = []
      const token =
        process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN ||
        process.env.BLOB_READ_WRITE_TOKEN
      if (token && screenshotFiles.length > 0) {
        for (let i = 0; i < screenshotFiles.length; i++) {
          const f = screenshotFiles[i]
          const ext = f.name.split(".").pop() || "jpg"
          const blob = await put(`${session!.user!.id}/support-reply-${Date.now()}-${i}.${ext}`, f, {
            access: "public",
            contentType: f.type,
            token: token as string,
          })
          attachmentUrls.push(blob.url)
        }
      }

      const res = await fetch(`/api/support/requests/${viewingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: replyText.trim(), attachmentUrls }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({ title: "Inviato", description: "Messaggio inviato." })
      setReplyText("")
      setScreenshotFiles([])
      loadDetail(viewingId)
    } catch (err: unknown) {
      toast({
        title: "Errore",
        description: (err as Error)?.message || "Impossibile inviare",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (status !== "authenticated" || !session?.user?.id || !role || !ALLOWED_ROLES.includes(role)) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Assistenza"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assistenza</DialogTitle>
            <DialogDescription>
              Invia richieste, descrivi problemi o allega screenshot. Riceverai risposta dall&apos;admin.
            </DialogDescription>
          </DialogHeader>

          {viewingId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setViewingId(null); setRequestDetail(null) }}>
                  ← Indietro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewingId && loadDetail(viewingId)}
                  title="Aggiorna messaggi"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Aggiorna
                </Button>
              </div>
              {requestDetail && (
                <>
                  <div className="rounded border p-3 bg-muted/50">
                    <p className="font-medium">{requestDetail.request?.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {requestDetail.request?.status === "closed" ? "Chiusa" : "Aperta"} ·{" "}
                      {requestDetail.request?.created_at &&
                        new Date(requestDetail.request.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto" id="support-messages">
                    {requestDetail.messages?.map((m: any) => (
                      <div
                        key={m.id}
                        className={`rounded p-3 text-sm ${
                          m.is_from_admin ? "bg-primary/10 ml-4" : "bg-muted mr-4"
                        }`}
                      >
                        <p className="font-medium text-xs mb-1">{m.is_from_admin ? "Supporto" : "Tu"}</p>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        {m.attachment_urls?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.attachment_urls.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary underline"
                              >
                                Screenshot {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(m.created_at).toLocaleString("it-IT")}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {requestDetail.request?.status !== "closed" && (
                    <form onSubmit={handleReply} className="space-y-2">
                      <Textarea
                        placeholder="Scrivi una risposta..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="support-reply-files"
                          onChange={(e) => setScreenshotFiles(Array.from(e.target.files || []))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("support-reply-files")?.click()}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Screenshot
                        </Button>
                        <Button type="submit" disabled={sending || !replyText.trim()}>
                          <Send className="h-4 w-4 mr-1" />
                          {sending ? "Invio..." : "Invia"}
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {requests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => loadDetail(r.id)}
                    className="w-full text-left rounded border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium truncate">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "closed" ? "Chiusa" : "Aperta"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </button>
                ))}
                {requests.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Nessuna richiesta precedente.</p>
                )}
              </div>

              <form onSubmit={handleCreate} className="space-y-3 pt-4 border-t">
                <p className="font-medium">Nuova richiesta</p>
                <div>
                  <Label htmlFor="support-subject">Oggetto</Label>
                  <Input
                    id="support-subject"
                    placeholder="Es: Problema con il caricamento..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="support-message">Messaggio</Label>
                  <Textarea
                    id="support-message"
                    placeholder="Descrivi il problema o la richiesta..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="support-files"
                    onChange={(e) => setScreenshotFiles(Array.from(e.target.files || []))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("support-files")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Screenshot
                  </Button>
                  {screenshotFiles.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {screenshotFiles.length} file selezionati
                    </span>
                  )}
                </div>
                <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Invio..." : "Invia richiesta"}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
