"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseClient } from "@/lib/supabase/client"
import { put } from "@vercel/blob"
import ImageCropper from "@/components/image-cropper"
import { Instagram, Youtube, TrendingUp, Plus, X } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

type CreatorOnboardingStep = "profile" | "social-kolbed"

interface SocialAccountInput {
  platform: "instagram" | "tiktok" | "youtube"
  username: string
  follower_count: string
}

interface CreatorOnboardingProps {
  redirectOnComplete?: string
}

const KOL_BED_LEVELS = [
  {
    value: "base",
    label: "Base",
    desc: "1 reel/post + 2 storie a settimana sul tuo profilo esterno per ogni notte KOL&BED (+ contenuti a richiesta per l'host). Strutture base; in alcuni casi importo minimo per pulizie e tasse di soggiorno.",
  },
  {
    value: "medio",
    label: "Medio",
    desc: "Contenuti a scelta da accordare con l'host. Possibilità di pubblicare anche sul profilo personale dell'influencer, a scelta dell'host.",
  },
  {
    value: "lusso",
    label: "Lusso",
    desc: "Fino a 2 reel + 1 post + 5 storie a settimana sul profilo esterno per ogni notte KOL&BED (+ contenuti per l'host). Strutture lusso.",
  },
] as const

type AnalyticsPeriod = "90" | "30" | "7"
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

const PLATFORM_OPTS = [
  { value: "instagram" as const, label: "Instagram", Icon: Instagram },
  { value: "tiktok" as const, label: "TikTok", Icon: TrendingUp },
  { value: "youtube" as const, label: "YouTube", Icon: Youtube },
]

export default function CreatorOnboarding({ redirectOnComplete }: CreatorOnboardingProps) {
  const completionUrl = redirectOnComplete ?? "/profile"
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const supabase = createSupabaseClient()
  const [step, setStep] = useState<CreatorOnboardingStep>("profile")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarFileToCrop, setAvatarFileToCrop] = useState<File | null>(null)
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false)

  const [profileData, setProfileData] = useState({
    fullName: "",
    username: "",
    bio: "",
    avatarFile: null as File | null,
    avatarPreview: "",
  })

  const initAnalytics = () =>
    Object.fromEntries(
      ANALYTICS_CATEGORIES.map((c) => [c.key, { existingUrls: [] as string[], files: [] as File[], previewUrls: [] as string[] }])
    ) as Record<AnalyticsCategory, { existingUrls: string[]; files: File[]; previewUrls: string[] }>

  const [socialData, setSocialData] = useState({
    analyticsByCategory: initAnalytics(),
    niche: "",
    publishingStrategy: "",
    reelsPerWeek: "",
    postsPerWeek: "",
    carouselsPerWeek: "",
    storiesPerWeek: "",
    socialAccounts: [] as SocialAccountInput[],
    acceptProfilePhotoDifferent: false,
    acceptUsernameDifferent: false,
    kolBedLevel: "" as "" | "base" | "medio" | "lusso",
    travelCompanionsCount: "0",
    companionsAreCreators: false,
    companionsHaveIgOrTiktok: false,
    acceptPromoteOnlyNomadiqe: false,
  })

  useEffect(() => {
    const resolve = async () => {
      if (session?.user?.id) {
        setUserId(session.user.id)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) setUserId(user.id)
    }
    resolve()
  }, [session?.user?.id, supabase])

  useEffect(() => {
    const load = async () => {
      if (!userId) return
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, bio")
          .eq("id", userId)
          .maybeSingle()
        if (profile) {
          setProfileData({
            fullName: profile.full_name || "",
            username: profile.username || "",
            bio: profile.bio || "",
            avatarFile: null,
            avatarPreview: profile.avatar_url || "",
          })
        }
        const { data: co } = await supabase
          .from("creator_onboarding")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()
        if (co) {
          const c = co as any
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
          const analyticsByCategory = initAnalytics()
          for (const [col, key] of Object.entries(colToKey)) {
            let urls = c[col] ?? (col === "analytics_90_days_urls" ? c.analytics_screenshot_urls : null)
            if (urls && Array.isArray(urls)) analyticsByCategory[key as AnalyticsCategory].existingUrls = urls
          }
          setSocialData((s) => ({
            ...s,
            niche: co.niche || "",
            publishingStrategy: co.publishing_strategy || "",
            reelsPerWeek: co.reels_per_week != null ? String(co.reels_per_week) : "",
            postsPerWeek: co.posts_per_week != null ? String(co.posts_per_week) : "",
            carouselsPerWeek: co.carousels_per_week != null ? String(co.carousels_per_week) : "",
            storiesPerWeek: co.stories_per_week != null ? String(co.stories_per_week) : "",
            acceptProfilePhotoDifferent: !!co.accept_profile_photo_different,
            acceptUsernameDifferent: !!co.accept_username_different,
            kolBedLevel: (co.kol_bed_level as "" | "base" | "medio" | "lusso") || "",
            travelCompanionsCount: co.travel_companions_count != null ? String(co.travel_companions_count) : "0",
            companionsAreCreators: !!co.companions_are_creators,
            companionsHaveIgOrTiktok: !!co.companions_have_ig_or_tiktok,
            acceptPromoteOnlyNomadiqe: !!co.accept_promote_only_nomadiqe,
            analyticsByCategory,
          }))
        }
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("platform, username, follower_count")
          .eq("user_id", userId)
        if (accounts?.length) {
          setSocialData((s) => ({
            ...s,
            socialAccounts: accounts.map((a) => ({
              platform: a.platform as "instagram" | "tiktok" | "youtube",
              username: a.username || "",
              follower_count: String(a.follower_count ?? 0),
            })),
          }))
        }
      } catch (e) {
        console.error("Error loading creator onboarding state:", e)
      }
    }
    load()
  }, [userId, supabase])

  useEffect(() => {
    if (!profileData.username?.trim()) {
      setUsernameAvailable(null)
      return
    }
    const check = async () => {
      setCheckingUsername(true)
      try {
        const uid = session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", profileData.username.toLowerCase().trim())
          .maybeSingle()
        setUsernameAvailable(!data || (!!uid && data.id === uid))
      } catch {
        setUsernameAvailable(null)
      } finally {
        setCheckingUsername(false)
      }
    }
    const t = setTimeout(check, 400)
    return () => clearTimeout(t)
  }, [profileData.username, session?.user?.id, supabase])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= 10 * 1024 * 1024) {
      setAvatarFileToCrop(file)
      setShowAvatarCropper(true)
    } else if (file) {
      toast({ title: "Errore", description: "Immagine max 10MB", variant: "destructive" })
    }
    e.target.value = ""
  }

  const handleAvatarCropComplete = (cropped: File) => {
    setProfileData({
      ...profileData,
      avatarFile: cropped,
      avatarPreview: URL.createObjectURL(cropped),
    })
    setShowAvatarCropper(false)
    setAvatarFileToCrop(null)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({ title: "Errore", description: "Sessione non valida. Accedi di nuovo.", variant: "destructive" })
      router.push("/auth/signin")
      return
    }
    if (!profileData.fullName?.trim()) {
      toast({ title: "Errore", description: "Nome obbligatorio.", variant: "destructive" })
      return
    }
    if (!profileData.username?.trim()) {
      toast({ title: "Errore", description: "Username obbligatorio.", variant: "destructive" })
      return
    }
    if (usernameAvailable === false) {
      toast({ title: "Errore", description: "Username non disponibile.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      let avatarUrl = ""
      if (profileData.avatarFile) {
        try {
          const token =
            process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN ||
            process.env.NEW_BLOB_READ_WRITE_TOKEN ||
            process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN ||
            process.env.BLOB_READ_WRITE_TOKEN
          const ext = profileData.avatarFile.name.split(".").pop() || "jpg"
          const blob = await put(`${userId}/creator-avatar.${ext}`, profileData.avatarFile, {
            access: "public",
            contentType: profileData.avatarFile.type,
            token: token as string,
          })
          avatarUrl = blob.url
        } catch (err) {
          console.error("Avatar upload:", err)
          toast({ title: "Attenzione", description: "Avatar non caricato. Salvo senza foto." })
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.fullName.trim(),
          username: profileData.username.toLowerCase().trim(),
          bio: profileData.bio.trim() || null,
          avatar_url: avatarUrl || undefined,
        })
        .eq("id", userId)
      if (error) throw error
      toast({ title: "Salvato", description: "Profilo aggiornato." })
      setStep("social-kolbed")
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Salvataggio fallito", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const addSocialAccount = () => {
    const firstMissing = PLATFORM_OPTS.find(
      (p) => !socialData.socialAccounts.some((a) => a.platform === p.value)
    )
    if (!firstMissing) return
    setSocialData({
      ...socialData,
      socialAccounts: [
        ...socialData.socialAccounts,
        { platform: firstMissing.value, username: "", follower_count: "" },
      ],
    })
  }

  const updateSocialAccount = (idx: number, upd: Partial<SocialAccountInput>) => {
    const next = [...socialData.socialAccounts]
    next[idx] = { ...next[idx], ...upd }
    setSocialData({ ...socialData, socialAccounts: next })
  }

  const removeSocialAccount = (idx: number) => {
    setSocialData({
      ...socialData,
      socialAccounts: socialData.socialAccounts.filter((_, i) => i !== idx),
    })
  }

  const handleAnalyticsFiles = (key: AnalyticsCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => f.size <= 10 * 1024 * 1024)
    if (valid.length < files.length) {
      toast({ title: "Attenzione", description: "Alcuni file > 10MB ignorati." })
    }
    const curr = socialData.analyticsByCategory[key]
    const existing = curr.existingUrls.length + curr.files.length
    const allowed = Math.max(0, 10 - existing)
    const toAdd = valid.slice(0, allowed)
    const newFiles = [...curr.files, ...toAdd]
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f))
    setSocialData({
      ...socialData,
      analyticsByCategory: { ...socialData.analyticsByCategory, [key]: { ...curr, files: newFiles, previewUrls: newPreviews } },
    })
    e.target.value = ""
  }

  const removeAnalyticsFile = (key: AnalyticsCategory, idx: number) => {
    const curr = socialData.analyticsByCategory[key]
    const nextFiles = curr.files.filter((_, i) => i !== idx)
    const nextPreviews = nextFiles.map((f) => URL.createObjectURL(f))
    setSocialData({
      ...socialData,
      analyticsByCategory: { ...socialData.analyticsByCategory, [key]: { ...curr, files: nextFiles, previewUrls: nextPreviews } },
    })
  }

  const removeExistingAnalyticsUrl = (key: AnalyticsCategory, idx: number) => {
    const curr = socialData.analyticsByCategory[key]
    setSocialData({
      ...socialData,
      analyticsByCategory: { ...socialData.analyticsByCategory, [key]: { ...curr, existingUrls: curr.existingUrls.filter((_, i) => i !== idx) } },
    })
  }

  const handleSocialKolBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({ title: "Errore", description: "Sessione non valida.", variant: "destructive" })
      router.push("/auth/signin")
      return
    }
    if (!socialData.acceptProfilePhotoDifferent || !socialData.acceptUsernameDifferent) {
      toast({
        title: "Errore",
        description: "Devi accettare che foto e username Nomadiqe siano diversi dai profili social esterni.",
        variant: "destructive",
      })
      return
    }
    if (!socialData.acceptPromoteOnlyNomadiqe) {
      toast({
        title: "Errore",
        description: "Devi accettare di promuovere gli host solo su Nomadiqe.",
        variant: "destructive",
      })
      return
    }
    if (!socialData.kolBedLevel) {
      toast({ title: "Errore", description: "Seleziona il livello di coinvolgimento KOL&BED.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      setUploadingScreenshots(true)
      const token =
        process.env.NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEW_BLOB_READ_WRITE_TOKEN ||
        process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN ||
        process.env.BLOB_READ_WRITE_TOKEN

      const uploadFiles = async (files: File[], prefix: string) => {
        const urls: string[] = []
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          const ext = f.name.split(".").pop() || "jpg"
          const b = await put(`${userId}/${prefix}-${i}.${ext}`, f, {
            access: "public",
            contentType: f.type,
            token: token as string,
          })
          urls.push(b.url)
        }
        return urls
      }

      const keyToCol: Record<AnalyticsCategory, string> = {
        "90": "analytics_90_days_urls",
        "30": "analytics_30_days_urls",
        "7": "analytics_7_days_urls",
        views_pie: "views_pie_chart_urls",
        accounts_reached: "accounts_reached_urls",
        reels_content: "reels_content_urls",
        posts_content: "posts_content_urls",
        stories_content: "stories_content_urls",
        profile_activity: "profile_activity_urls",
        profile_visits: "profile_visits_urls",
        external_links: "external_links_taps_urls",
        audience_30: "audience_demographics_30_urls",
        audience_7: "audience_demographics_7_urls",
      }

      const uploads = ANALYTICS_CATEGORIES.map(({ key }) =>
        uploadFiles(socialData.analyticsByCategory[key].files, `analytics-${key}`)
      )
      const uploadedArrays = await Promise.all(uploads)
      setUploadingScreenshots(false)

      const analyticsPayload: Record<string, string[]> = {}
      for (let i = 0; i < ANALYTICS_CATEGORIES.length; i++) {
        const key = ANALYTICS_CATEGORIES[i].key
        const col = keyToCol[key]
        const existing = socialData.analyticsByCategory[key].existingUrls
        const newUrls = uploadedArrays[i]
        analyticsPayload[col] = [...existing, ...newUrls]
      }

      const onboardingPayload = {
        user_id: userId,
        ...analyticsPayload,
        niche: socialData.niche.trim() || null,
        publishing_strategy: socialData.publishingStrategy.trim() || null,
        reels_per_week: socialData.reelsPerWeek ? parseInt(socialData.reelsPerWeek, 10) : null,
        posts_per_week: socialData.postsPerWeek ? parseInt(socialData.postsPerWeek, 10) : null,
        carousels_per_week: socialData.carouselsPerWeek ? parseInt(socialData.carouselsPerWeek, 10) : null,
        stories_per_week: socialData.storiesPerWeek ? parseInt(socialData.storiesPerWeek, 10) : null,
        kol_bed_level: socialData.kolBedLevel,
        travel_companions_count: parseInt(socialData.travelCompanionsCount, 10) || 0,
        companions_are_creators: socialData.companionsAreCreators,
        companions_have_ig_or_tiktok: socialData.companionsHaveIgOrTiktok,
        accept_promote_only_nomadiqe: true,
        accept_profile_photo_different: socialData.acceptProfilePhotoDifferent,
        accept_username_different: socialData.acceptUsernameDifferent,
      }

      const { error: coError } = await supabase.from("creator_onboarding").upsert(onboardingPayload, {
        onConflict: "user_id",
      })
      if (coError) throw coError

      await supabase.from("social_accounts").delete().eq("user_id", userId)
      const uniqueByPlatform = Array.from(new Map(socialData.socialAccounts.map((a) => [a.platform, a])).values())
      for (const a of uniqueByPlatform) {
        if (!a.platform) continue
        await supabase.from("social_accounts").insert({
          user_id: userId,
          platform: a.platform,
          username: a.username.trim() || `@user`,
          follower_count: parseInt(a.follower_count, 10) || 0,
        })
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId)
      if (profileErr) console.warn("onboarding_completed update:", profileErr)

      toast({ title: "Onboarding completato", description: "Benvenuto su Nomadiqe!" })
      router.push(completionUrl)
    } catch (err: any) {
      setUploadingScreenshots(false)
      toast({ title: "Errore", description: err?.message || "Salvataggio fallito", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    )
  }

  if (step === "profile") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t("creator.onboarding.profileTitle")}</CardTitle>
              <CardDescription>{t("creator.onboarding.profileStep")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto profilo *</Label>
                  <div className="flex items-center gap-4">
                    {profileData.avatarPreview ? (
                      <img
                        src={profileData.avatarPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">👤</div>
                    )}
                    <Input type="file" accept="image/*" onChange={handleAvatarChange} className="flex-1" />
                  </div>
                  <p className="text-xs text-muted-foreground">Max 10MB. La foto non deve essere uguale a quella dei tuoi profili social.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome utente *</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    required
                    placeholder="Mario Rossi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value.replace(/\s/g, "") })}
                    required
                    placeholder="mariorossi"
                  />
                  {checkingUsername && <p className="text-xs text-muted-foreground">Verifica in corso...</p>}
                  {usernameAvailable === false && <p className="text-xs text-destructive">Username non disponibile</p>}
                  {usernameAvailable === true && <p className="text-xs text-green-600">Username disponibile</p>}
                  <p className="text-xs text-muted-foreground">Deve essere diverso dagli username dei tuoi profili social.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (opzionale)</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Racconta qualcosa di te..."
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || usernameAvailable === false || checkingUsername}>
                  {loading ? t("onboarding.saving") : t("general.continue")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <ImageCropper
          open={showAvatarCropper}
          onOpenChange={setShowAvatarCropper}
          imageFile={avatarFileToCrop}
          onCropComplete={handleAvatarCropComplete}
          aspectRatio={1}
          maxWidth={800}
          maxHeight={800}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-black">
      <div className="max-w-2xl mx-auto min-w-0">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t("creator.onboarding.socialTitle")}</CardTitle>
            <CardDescription>{t("creator.onboarding.socialStep")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSocialKolBedSubmit} className="space-y-6">
              {ANALYTICS_CATEGORIES.map(({ key, label }) => {
                const data = socialData.analyticsByCategory[key]
                return (
                  <div key={key} className="space-y-2">
                    <Label>Screenshot analitiche — {label}</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleAnalyticsFiles(key, e)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Carica screenshot (max 10, 10MB ciascuno).</p>
                    {(data.existingUrls.length > 0 || data.previewUrls.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {data.existingUrls.map((url, i) => (
                          <div key={`ex-${key}-${i}`} className="relative">
                            <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => removeExistingAnalyticsUrl(key, i)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {data.previewUrls.map((url, i) => (
                          <div key={`new-${key}-${i}`} className="relative">
                            <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => removeAnalyticsFile(key, i)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="space-y-2">
                <Label htmlFor="niche">Nicchia</Label>
                <Input
                  id="niche"
                  value={socialData.niche}
                  onChange={(e) => setSocialData({ ...socialData, niche: e.target.value })}
                  placeholder="es. travel, lifestyle, food"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy">Strategia di pubblicazione</Label>
                <Textarea
                  id="strategy"
                  value={socialData.publishingStrategy}
                  onChange={(e) => setSocialData({ ...socialData, publishingStrategy: e.target.value })}
                  placeholder="Descrivi la tua strategia..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Reel/sett.</Label>
                  <Input
                    type="number"
                    min="0"
                    value={socialData.reelsPerWeek}
                    onChange={(e) => setSocialData({ ...socialData, reelsPerWeek: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Post/sett.</Label>
                  <Input
                    type="number"
                    min="0"
                    value={socialData.postsPerWeek}
                    onChange={(e) => setSocialData({ ...socialData, postsPerWeek: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caroselli/sett.</Label>
                  <Input
                    type="number"
                    min="0"
                    value={socialData.carouselsPerWeek}
                    onChange={(e) => setSocialData({ ...socialData, carouselsPerWeek: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storie/sett.</Label>
                  <Input
                    type="number"
                    min="0"
                    value={socialData.storiesPerWeek}
                    onChange={(e) => setSocialData({ ...socialData, storiesPerWeek: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Profili social e follower</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSocialAccount}>
                    <Plus className="w-4 h-4 mr-1" /> Aggiungi
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Inserisci follower per ciascun profilo (separati).</p>
                <div className="space-y-3">
                  {socialData.socialAccounts.map((acc, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-3 border rounded-lg">
                      <Select
                        value={acc.platform}
                        onValueChange={(v: "instagram" | "tiktok" | "youtube") => updateSocialAccount(idx, { platform: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_OPTS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="@username"
                        value={acc.username}
                        onChange={(e) => updateSocialAccount(idx, { username: e.target.value })}
                        className="flex-1 min-w-24"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Follower"
                        value={acc.follower_count}
                        onChange={(e) => updateSocialAccount(idx, { follower_count: e.target.value })}
                        className="w-28"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSocialAccount(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <Label className="flex items-center gap-2">
                  Regole profilo Nomadiqe
                  <span className="text-destructive font-semibold">(Obbligatorie)</span>
                </Label>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="photoDiff"
                    checked={socialData.acceptProfilePhotoDifferent}
                    onCheckedChange={(v) => setSocialData({ ...socialData, acceptProfilePhotoDifferent: !!v })}
                  />
                  <label htmlFor="photoDiff" className="text-sm leading-tight cursor-pointer break-words min-w-0">
                    La mia foto profilo su Nomadiqe non sarà uguale a quella dei profili social esterni.
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="userDiff"
                    checked={socialData.acceptUsernameDifferent}
                    onCheckedChange={(v) => setSocialData({ ...socialData, acceptUsernameDifferent: !!v })}
                  />
                  <label htmlFor="userDiff" className="text-sm leading-tight cursor-pointer break-words min-w-0">
                    Nome utente e username Nomadiqe saranno diversi da quelli dei profili social esterni.
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Livello KOL&BED *</Label>
                <div className="space-y-2">
                  {KOL_BED_LEVELS.map((k) => (
                    <div
                      key={k.value}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSocialData({ ...socialData, kolBedLevel: k.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSocialData({ ...socialData, kolBedLevel: k.value })
                        }
                      }}
                      className={`rounded-lg border p-4 text-left transition-colors cursor-pointer hover:bg-muted/50 ${
                        socialData.kolBedLevel === k.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border"
                      }`}
                    >
                      <div className="font-semibold text-foreground">{k.label}</div>
                      <p className="mt-1 text-sm text-muted-foreground break-words whitespace-normal">
                        {k.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <Label>Compagni di viaggio</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-muted-foreground">In quante persone vuoi viaggiare?</Label>
                  <Input
                    type="number"
                    min="0"
                    value={socialData.travelCompanionsCount}
                    onChange={(e) => setSocialData({ ...socialData, travelCompanionsCount: e.target.value })}
                    className="w-20"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="compCreators"
                    checked={socialData.companionsAreCreators}
                    onCheckedChange={(v) => setSocialData({ ...socialData, companionsAreCreators: !!v })}
                  />
                  <label htmlFor="compCreators" className="text-sm cursor-pointer">
                    Le altre persone sono influencer o content creator.
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="compIg"
                    checked={socialData.companionsHaveIgOrTiktok}
                    onCheckedChange={(v) => setSocialData({ ...socialData, companionsHaveIgOrTiktok: !!v })}
                  />
                  <label htmlFor="compIg" className="text-sm cursor-pointer">
                    Hanno profili Instagram, TikTok o altri social.
                  </label>
                </div>
                <p className="text-xs text-muted-foreground break-words">
                  Se sì, anche loro devono creare un account Nomadiqe e richiedere la collaborazione insieme all&apos;host, spiegando la situazione e ottenendo l&apos;approvazione dell&apos;host.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                <Checkbox
                  id="promoNomadiqe"
                  checked={socialData.acceptPromoteOnlyNomadiqe}
                  onCheckedChange={(v) => setSocialData({ ...socialData, acceptPromoteOnlyNomadiqe: !!v })}
                />
                <label htmlFor="promoNomadiqe" className="text-sm font-medium cursor-pointer break-words min-w-0">
                  Quando pubblico le strutture su Instagram, TikTok o altre piattaforme, accetto di menzionare sempre prima Nomadiqe e poi la struttura dell&apos;host. Se condivido un link, userò il link della struttura su Nomadiqe.
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("profile")}>
                  Indietro
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    loading ||
                    uploadingScreenshots ||
                    !socialData.acceptProfilePhotoDifferent ||
                    !socialData.acceptUsernameDifferent
                  }
                >
                  {loading || uploadingScreenshots ? "Salvataggio..." : "Completa onboarding"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
