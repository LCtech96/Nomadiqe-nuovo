"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { put } from "@vercel/blob"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Instagram, Youtube, Upload, ImageIcon } from "lucide-react"

type AnalyticsCategory =
  | "90"
  | "30"
  | "7"
  | "views_pie"
  | "accounts_reached"
  | "reels_content"
  | "posts_content"
  | "stories_content"
  | "profile_activity"
  | "profile_visits"
  | "external_links"
  | "audience_30"
  | "audience_7"

const ANALYTICS_CATEGORIES: { key: AnalyticsCategory; label: string }[] = [
  { key: "90", label: "Ultimi 90 giorni" },
  { key: "30", label: "Ultimo mese" },
  { key: "7", label: "Ultima settimana" },
  { key: "views_pie", label: "Grafico a torta views (followers vs non-followers)" },
  { key: "accounts_reached", label: "Accounts reached" },
  { key: "reels_content", label: "By content type: Reels (% followers e non followers)" },
  { key: "posts_content", label: "By content type: Posts" },
  { key: "stories_content", label: "By content type: Stories" },
  { key: "profile_activity", label: "% Profile activity" },
  { key: "profile_visits", label: "Profile visits" },
  { key: "external_links", label: "External links taps" },
  { key: "audience_30", label: "Audience demographics (ultimi 30 giorni)" },
  { key: "audience_7", label: "Audience demographics (ultimi 7 giorni)" },
]

interface Collaboration {
  id: string
  host_id: string
  property_id: string
  collaboration_type: string
  status: string
  property: {
    name: string
    city: string
    country: string
  }
  host: {
    username: string
    full_name: string
  }
}

export default function CreatorDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [socialAccounts, setSocialAccounts] = useState<any[]>([])
  const [analyticsByCategory, setAnalyticsByCategory] = useState<Record<AnalyticsCategory, string[]>>(() =>
    Object.fromEntries(ANALYTICS_CATEGORIES.map((c) => [c.key, []])) as Record<AnalyticsCategory, string[]>
  )
  const [uploadingAnalytics, setUploadingAnalytics] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!session?.user?.id) return
    const check = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle()
      if (profile?.role !== "creator") {
        setLoading(false)
        router.push("/onboarding")
        return
      }
      if (profile && !profile.onboarding_completed) {
        setLoading(false)
        router.push("/onboarding")
        return
      }
      loadData()
    }
    check()
  }, [session?.user?.id, router, supabase])

  const loadData = async () => {
    try {
      // Load collaborations
      const { data: collabsData, error: collabsError } = await supabase
        .from("collaborations")
        .select(`
          *,
          property:properties(id, name, city, country),
          host:profiles!collaborations_host_id_fkey(username, full_name)
        `)
        .eq("creator_id", session!.user.id)
        .order("created_at", { ascending: false })

      if (collabsError) throw collabsError
      setCollaborations(collabsData || [])

      // Load social accounts
      const { data: socialData, error: socialError } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", session!.user.id)

      if (socialError) throw socialError
      setSocialAccounts(socialData || [])

      // Load creator onboarding (analytics screenshots)
      const cols = [
        "analytics_90_days_urls",
        "analytics_30_days_urls",
        "analytics_7_days_urls",
        "analytics_screenshot_urls",
        "views_pie_chart_urls",
        "accounts_reached_urls",
        "reels_content_urls",
        "posts_content_urls",
        "stories_content_urls",
        "profile_activity_urls",
        "profile_visits_urls",
        "external_links_taps_urls",
        "audience_demographics_30_urls",
        "audience_demographics_7_urls",
      ]
      const { data: onboarding } = await supabase
        .from("creator_onboarding")
        .select(cols.join(", "))
        .eq("user_id", session!.user.id)
        .maybeSingle()
      const o = (onboarding || {}) as Record<string, string[] | null | undefined>
      const colToKey: Record<string, AnalyticsCategory> = {
        analytics_90_days_urls: "90",
        analytics_30_days_urls: "30",
        analytics_7_days_urls: "7",
        views_pie_chart_urls: "views_pie",
        accounts_reached_urls: "accounts_reached",
        reels_content_urls: "reels_content",
        posts_content_urls: "posts_content",
        stories_content_urls: "stories_content",
        profile_activity_urls: "profile_activity",
        profile_visits_urls: "profile_visits",
        external_links_taps_urls: "external_links",
        audience_demographics_30_urls: "audience_30",
        audience_demographics_7_urls: "audience_7",
      }
      const next: Record<AnalyticsCategory, string[]> = Object.fromEntries(
        ANALYTICS_CATEGORIES.map((c) => [c.key, []])
      ) as Record<AnalyticsCategory, string[]>
      for (const [col, key] of Object.entries(colToKey)) {
        const urls = o[col] ?? (col === "analytics_90_days_urls" ? o.analytics_screenshot_urls : null)
        if (urls && Array.isArray(urls)) next[key] = urls
      }
      setAnalyticsByCategory(next)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAnalyticsScreenshots = async (period: AnalyticsCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !session?.user?.id) return
    setUploadingAnalytics(period)
    try {
      const token =
        process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN ||
        process.env.BLOB_READ_WRITE_TOKEN
      if (!token) {
        toast({ title: "Errore", description: "Configurazione upload non disponibile.", variant: "destructive" })
        return
      }
      const newUrls: string[] = []
      const base = Date.now()
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const ext = f.name.split(".").pop() || "jpg"
        const blob = await put(`${session.user.id}/analytics-${period}-${base}-${i}.${ext}`, f, {
          access: "public",
          contentType: f.type,
          token: token as string,
        })
        newUrls.push(blob.url)
      }
      const existing = analyticsByCategory[period] || []
      const allUrls = [...existing, ...newUrls]

      const res = await fetch("/api/creator/analytics-screenshots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ period, urls: allUrls }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Errore nel salvataggio")
      setAnalyticsByCategory((prev) => ({ ...prev, [period]: allUrls }))
      const label = ANALYTICS_CATEGORIES.find((c) => c.key === period)?.label || period
      toast({ title: "Caricati", description: `${newUrls.length} screenshot caricati.` })
      e.target.value = ""
    } catch (err: unknown) {
      console.error("Upload analytics:", err)
      toast({
        title: "Errore",
        description: (err as Error)?.message || "Impossibile caricare gli screenshot.",
        variant: "destructive",
      })
    } finally {
      setUploadingAnalytics(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Creator</h1>
          <p className="text-muted-foreground">Gestisci le tue collaborazioni e contenuti</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Account social</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{socialAccounts.length}</p>
              <p className="text-sm text-muted-foreground">Account collegati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collaborazioni attive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {collaborations.filter((c) => c.status === "accepted").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totale collaborazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{collaborations.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Account social collegati</CardTitle>
              <CardDescription>Collega i tuoi account per mostrare le statistiche</CardDescription>
            </CardHeader>
            <CardContent>
              {socialAccounts.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Nessun account social collegato
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/creator/social">
                      <Instagram className="w-4 h-4 mr-2" />
                      Collega account
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {socialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {account.platform === "instagram" && (
                          <Instagram className="w-5 h-5" />
                        )}
                        {account.platform === "youtube" && (
                          <Youtube className="w-5 h-5" />
                        )}
                        <div>
                          <p className="font-semibold">@{account.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.follower_count.toLocaleString()} follower
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Le tue collaborazioni</CardTitle>
              <CardDescription>Gestisci le partnership con gli host</CardDescription>
            </CardHeader>
            <CardContent>
              {collaborations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna collaborazione ancora
                </p>
              ) : (
                <div className="space-y-3">
                  {collaborations.map((collab) => (
                    <div key={collab.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{collab.property.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {collab.property.city}, {collab.property.country}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            collab.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : collab.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {collab.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {collab.collaboration_type.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Analitiche aggiornate
            </CardTitle>
            <CardDescription>
              Carica screenshot: grafico views (followers/non-followers), accounts reached, reels/posts/stories, profile activity, profile visits, external links, audience demographics (30d e 7d). Solo l&apos;admin può visualizzarli.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {ANALYTICS_CATEGORIES.map(({ key, label }) => {
              const urls = analyticsByCategory[key] || []
              const inputId = `analytics-input-${key}`
              return (
                <div key={key}>
                  <Label className="text-base font-medium">{label}</Label>
                  {urls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2 mb-2">
                      {urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video rounded-lg border overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                        >
                          <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUploadAnalyticsScreenshots(key, e)}
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById(inputId)?.click()}
                    disabled={!!uploadingAnalytics}
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingAnalytics === key ? "Caricamento..." : `Carica ${label.toLowerCase()}`}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

