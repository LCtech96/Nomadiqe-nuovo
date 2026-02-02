"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, X, ExternalLink } from "lucide-react"
import Link from "next/link"

type Item = {
  id: string
  user_id: string
  link_url: string
  status: string
  bio_snippet: string | null
  created_at: string
  profile: {
    id: string
    full_name?: string
    username?: string
    email?: string
    role?: string
  } | null
}

export default function BioLinkApprovalPanel() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/bio-links?status=pending", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      setItems(data.items || [])
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

  const handleAction = async (itemId: string, action: "approve" | "reject") => {
    setActingId(itemId)
    try {
      const res = await fetch(`/api/admin/bio-links/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Errore")
      toast({
        title: action === "approve" ? "Approvato" : "Rifiutato",
        description:
          action === "approve"
            ? "Il link è ora cliccabile nella bio dell'host."
            : "Il link non è stato approvato.",
      })
      await load()
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Operazione fallita",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento link in attesa...
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link nella bio host</CardTitle>
        <CardDescription>
          I link (https://, http://, www.) inseriti dagli host nella bio non sono cliccabili finché non vengono approvati.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            Nessun link in attesa di approvazione.
          </p>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono break-all text-primary">
                      {item.link_url}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Da:{" "}
                      {item.profile?.full_name ||
                        item.profile?.username ||
                        item.profile?.email ||
                        item.user_id}
                      {item.profile?.role && (
                        <Badge variant="outline" className="ml-2">
                          {item.profile.role}
                        </Badge>
                      )}
                    </p>
                    {item.bio_snippet && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        &quot;{item.bio_snippet}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/profile/${item.user_id}`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Profilo
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAction(item.id, "approve")}
                      disabled={actingId === item.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approva
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(item.id, "reject")}
                      disabled={actingId === item.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
