"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronDown, ChevronUp, User, X } from "lucide-react"

type Creator = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  role: string | null
  creator_verified_at: string | null
  creator_verified_by: string | null
  onboarding: {
    user_id: string
    analytics_screenshot_urls?: string[] | null
    analytics_90_days_urls?: string[] | null
    analytics_30_days_urls?: string[] | null
    analytics_7_days_urls?: string[] | null
    views_pie_chart_urls?: string[] | null
    accounts_reached_urls?: string[] | null
    reels_content_urls?: string[] | null
    posts_content_urls?: string[] | null
    stories_content_urls?: string[] | null
    profile_activity_urls?: string[] | null
    profile_visits_urls?: string[] | null
    external_links_taps_urls?: string[] | null
    audience_demographics_30_urls?: string[] | null
    audience_demographics_7_urls?: string[] | null
    niche: string | null
    kol_bed_level: string | null
  } | null
  analytics: {
    creator_id: string
    profile_views: number | null
    total_followers: number | null
    engagement_rate: number | null
  } | null
}

export default function CreatorVerificationPanel() {
  const { toast } = useToast()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [form, setForm] = useState<{
    profile_views: string
    total_followers: string
    engagement_rate: string
  }>({ profile_views: "", total_followers: "", engagement_rate: "" })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/creator-verification")
      if (!res.ok) throw new Error("Impossibile caricare i creator")
      const data = await res.json()
      setCreators(data.creators || [])
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

  const handleApprove = async (creatorId: string) => {
    setActingId(creatorId)
    try {
      const analytics: Record<string, number> = {}
      const pv = parseInt(form.profile_views, 10)
      const tf = parseInt(form.total_followers, 10)
      const er = parseFloat(form.engagement_rate)
      if (!Number.isNaN(pv)) analytics.profile_views = pv
      if (!Number.isNaN(tf)) analytics.total_followers = tf
      if (!Number.isNaN(er)) analytics.engagement_rate = er

      const res = await fetch("/api/admin/creator-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, action: "approve", analytics: Object.keys(analytics).length ? analytics : undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Errore durante l'approvazione")
      setDetailId(null)
      setForm({ profile_views: "", total_followers: "", engagement_rate: "" })
      await load()
      toast({ title: "Approvato", description: "Creator verificato." })
    } catch (e: unknown) {
      toast({
        title: "Errore",
        description: (e as Error)?.message || "Errore durante l'approvazione",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  const openDetail = (c: Creator) => {
    setDetailId(c.id)
    setForm({
      profile_views: c.analytics?.profile_views != null ? String(c.analytics.profile_views) : "",
      total_followers: c.analytics?.total_followers != null ? String(c.analytics.total_followers) : "",
      engagement_rate: c.analytics?.engagement_rate != null ? String(c.analytics.engagement_rate) : "",
    })
  }

  const detail = creators.find((c) => c.id === detailId)

  if (loading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Caricamento creator...
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Verifica creator</CardTitle>
          <CardDescription>
            Visualizza gli screenshot delle analitiche (solo admin), inserisci le analitiche e approva la verifica per assegnare il badge &quot;Verificato&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!creators.length ? (
            <p className="text-center text-muted-foreground py-6">Nessun creator trovato.</p>
          ) : (
            <div className="space-y-3">
              {creators.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {c.avatar_url ? (
                      <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                        <img
                          src={c.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{c.full_name || c.username || c.id}</p>
                      {c.username && <p className="text-sm text-muted-foreground">@{c.username}</p>}
                    </div>
                    {c.creator_verified_at ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        <Check className="w-3 h-3 mr-1" /> Verificato
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non verificato</Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (detailId === c.id ? setDetailId(null) : openDetail(c))}
                  >
                    {detailId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Dettaglio
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setFullscreenImage(null)}
          aria-label="Chiudi immagine"
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Torna indietro"
          >
            <X className="w-5 h-5" />
            <span>Torna indietro</span>
          </button>
          <img
            src={fullscreenImage}
            alt="Screenshot analitiche"
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.full_name || detail?.username || "Creator"} — Screenshot e analitiche
            </DialogTitle>
            <DialogDescription>
              Gli screenshot sono visibili solo qui. Inserisci le analitiche e clicca &quot;Approva verifica&quot; per assegnare il badge.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {[
                { col: "analytics_90_days_urls", label: "Ultimi 90 giorni", fallback: "analytics_screenshot_urls" },
                { col: "analytics_30_days_urls", label: "Ultimo mese", fallback: null },
                { col: "analytics_7_days_urls", label: "Ultima settimana", fallback: null },
                { col: "views_pie_chart_urls", label: "Grafico views (followers vs non-followers)", fallback: null },
                { col: "accounts_reached_urls", label: "Accounts reached", fallback: null },
                { col: "reels_content_urls", label: "Reels (% followers/non-followers)", fallback: null },
                { col: "posts_content_urls", label: "Posts", fallback: null },
                { col: "stories_content_urls", label: "Stories", fallback: null },
                { col: "profile_activity_urls", label: "% Profile activity", fallback: null },
                { col: "profile_visits_urls", label: "Profile visits", fallback: null },
                { col: "external_links_taps_urls", label: "External links taps", fallback: null },
                { col: "audience_demographics_30_urls", label: "Audience demographics (30 giorni)", fallback: null },
                { col: "audience_demographics_7_urls", label: "Audience demographics (7 giorni)", fallback: null },
              ].map(({ col, label, fallback }) => {
                const o = detail.onboarding as Record<string, unknown> | null
                const urls = (o?.[col] ?? (fallback ? o?.[fallback] : null) ?? []) as string[]
                return (
                  <div key={col}>
                    <Label className="mb-2 block">Screenshot — {label}</Label>
                    {urls?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {urls.map((url: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setFullscreenImage(url)}
                            className="flex h-24 w-24 shrink-0 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover pointer-events-none" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessuno screenshot.</p>
                    )}
                  </div>
                )
              })}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="pv">Profile views</Label>
                  <Input
                    id="pv"
                    type="number"
                    min={0}
                    value={form.profile_views}
                    onChange={(e) => setForm((f) => ({ ...f, profile_views: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="tf">Totale follower</Label>
                  <Input
                    id="tf"
                    type="number"
                    min={0}
                    value={form.total_followers}
                    onChange={(e) => setForm((f) => ({ ...f, total_followers: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="er">Engagement rate %</Label>
                  <Input
                    id="er"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.engagement_rate}
                    onChange={(e) => setForm((f) => ({ ...f, engagement_rate: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              {!detail.creator_verified_at && (
                <Button
                  className="w-full"
                  disabled={!!actingId}
                  onClick={() => handleApprove(detail.id)}
                >
                  {actingId ? "Salvataggio..." : "Approva verifica"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
