"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Profile } from "@/types/user"
import Image from "next/image"
import Link from "next/link"
import {
  Building2,
  ArrowRight,
  Search,
  Users,
  Eye,
  Instagram,
  Youtube,
  User,
  MapPin,
  Calendar,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreatorProfile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  points: number
  social_accounts?: Array<{
    platform: string
    username: string
    follower_count: number
    verified: boolean
  }>
  total_followers?: number
  profile_views?: number
}

interface CleaningRequest {
  id: string
  host_id: string
  service_id: string
  property_id: string | null
  description: string | null
  requested_date: string | null
  status: string
  price: number | null
  created_at: string
  service_title?: string | null
  host_name?: string | null
  host_username?: string | null
  property_city?: string | null
  property_address?: string | null
}

interface JollyCleaningCard {
  jolly_id: string
  avatar_url: string | null
  full_name: string | null
  username: string | null
  price_per_hour: number | null
  price_per_service: number | null
  location_country: string | null
  experience_years: number | null
  thumbs_up: number
  thumbs_down: number
  service_id: string
}

export default function KOLBedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [cleaningRequests, setCleaningRequests] = useState<CleaningRequest[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"creators" | "pulizie">("creators")
  const [jollyCleaning, setJollyCleaning] = useState<JollyCleaningCard[]>([])
  const [loadingJollyCleaning, setLoadingJollyCleaning] = useState(false)

  const isJollyOrCleaner =
    profile?.role === "jolly" || profile?.role === "cleaner"
  const isHost = profile?.role === "host"

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && session?.user?.id) {
      loadProfile()
    }
  }, [status, session, router])

  useEffect(() => {
    if (!profile || status !== "authenticated" || !session?.user?.id) return

    if (isJollyOrCleaner) {
      loadCleaningRequests()
    } else {
      loadCreators()
    }
  }, [profile?.id, profile?.role, status, session?.user?.id])

  useEffect(() => {
    if (viewMode === "pulizie" && !isJollyOrCleaner) {
      loadJollyCleaningFeed()
    }
  }, [viewMode, isJollyOrCleaner]) // eslint-disable-line react-hooks/exhaustive-deps -- loadJollyCleaningFeed stable

  const loadCleaningRequests = async () => {
    try {
      setLoadingData(true)

      const { data: cleaningServices, error: svcErr } = await supabase
        .from("manager_services")
        .select("id")
        .eq("service_type", "cleaning")

      if (svcErr) throw svcErr
      const serviceIds = (cleaningServices || []).map((s) => s.id)
      if (serviceIds.length === 0) {
        setCleaningRequests([])
        return
      }

      const { data: requestsData, error: reqErr } = await supabase
        .from("service_requests")
        .select("id, host_id, service_id, property_id, description, requested_date, status, price, created_at")
        .in("service_id", serviceIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (reqErr) throw reqErr

      const requests = requestsData || []
      const hostIds = Array.from(new Set(requests.map((r) => r.host_id)))
      const propertyIds = Array.from(
        new Set(requests.map((r) => r.property_id).filter(Boolean) as string[])
      )
      const serviceIdList = Array.from(new Set(requests.map((r) => r.service_id)))

      const [hostsRes, propertiesRes, servicesRes] = await Promise.all([
        hostIds.length > 0
          ? supabase.from("profiles").select("id, full_name, username").in("id", hostIds)
          : Promise.resolve({ data: [] }),
        propertyIds.length > 0
          ? supabase.from("properties").select("id, city, address").in("id", propertyIds)
          : Promise.resolve({ data: [] }),
        serviceIdList.length > 0
          ? supabase.from("manager_services").select("id, title").in("id", serviceIdList)
          : Promise.resolve({ data: [] }),
      ])

      const hostMap = Object.fromEntries(
        (hostsRes.data || []).map((h) => [h.id, h])
      )
      const propertyMap = Object.fromEntries(
        (propertiesRes.data || []).map((p) => [p.id, p])
      )
      const serviceMap = Object.fromEntries(
        (servicesRes.data || []).map((s) => [s.id, s])
      )

      const enriched: CleaningRequest[] = requests.map((r) => {
        const host = hostMap[r.host_id]
        const prop = r.property_id ? propertyMap[r.property_id] : null
        const svc = serviceMap[r.service_id]
        return {
          ...r,
          service_title: svc?.title ?? null,
          host_name: host?.full_name ?? null,
          host_username: host?.username ?? null,
          property_city: prop?.city ?? null,
          property_address: prop?.address ?? null,
        }
      })

      setCleaningRequests(enriched)
    } catch (e) {
      console.error("Error loading cleaning requests:", e)
      setCleaningRequests([])
    } finally {
      setLoadingData(false)
    }
  }

  const loadCreators = async () => {
    try {
      setLoadingData(true)

      const { data: creatorsData, error: creatorsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "creator")
        .order("created_at", { ascending: false })

      if (creatorsError) throw creatorsError

      const creatorIds = (creatorsData || []).map((c) => c.id)
      let socialAccountsMap: { [key: string]: any[] } = {}

      if (creatorIds.length > 0) {
        const { data: socialData } = await supabase
          .from("social_accounts")
          .select("*")
          .in("user_id", creatorIds)

        socialAccountsMap = (socialData || []).reduce((acc, account) => {
          if (!acc[account.user_id]) acc[account.user_id] = []
          acc[account.user_id].push(account)
          return acc
        }, {} as { [key: string]: any[] })
      }

      const viewsMap: { [key: string]: number } = {}
      if (creatorIds.length > 0) {
        const { data: analyticsData } = await supabase
          .from("creator_manual_analytics")
          .select("creator_id, profile_views")
          .in("creator_id", creatorIds)

        analyticsData?.forEach((a) => {
          if (a.profile_views) viewsMap[a.creator_id] = a.profile_views
        })

        for (const cid of creatorIds) {
          if (viewsMap[cid] != null) continue
          const { count } = await supabase
            .from("profile_views")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", cid)
          if (count != null) viewsMap[cid] = count
        }
      }

      const enrichedCreators = (creatorsData || []).map((creator) => {
        const socialAccounts = socialAccountsMap[creator.id] || []
        const totalFollowers = socialAccounts.reduce(
          (sum, acc) => sum + (acc.follower_count || 0),
          0
        )
        return {
          ...creator,
          social_accounts: socialAccounts,
          total_followers: totalFollowers,
          profile_views: viewsMap[creator.id] || 0,
        }
      })

      setCreators(enrichedCreators)
    } catch (error) {
      console.error("Error loading creators:", error)
      setCreators([])
    } finally {
      setLoadingData(false)
    }
  }

  const loadJollyCleaningFeed = async () => {
    try {
      setLoadingJollyCleaning(true)
      const { data: services, error: svcErr } = await supabase
        .from("manager_services")
        .select("id, manager_id, price_per_hour, price_per_service, location_country, experience_years")
        .eq("service_type", "cleaning")
        .eq("is_active", true)

      if (svcErr) throw svcErr
      if (!services?.length) {
        setJollyCleaning([])
        return
      }

      const jollyIds = Array.from(new Set(services.map((s) => s.manager_id)))
      const { data: profilesData, error: profErr } = await supabase
        .from("profiles")
        .select("id, avatar_url, full_name, username")
        .in("id", jollyIds)
        .eq("role", "jolly")

      if (profErr) throw profErr
      const profileMap = Object.fromEntries((profilesData || []).map((p) => [p.id, p]))

      let ratingMap: Record<string, { thumbs_up: number; thumbs_down: number }> = {}
      const { data: ratingData } = await supabase.from("jolly_rating_counts").select("jolly_id, thumbs_up, thumbs_down")
      if (!(ratingData == null)) {
        ratingMap = Object.fromEntries(
          ratingData.map((r) => [
            r.jolly_id,
            { thumbs_up: r.thumbs_up ?? 0, thumbs_down: r.thumbs_down ?? 0 },
          ])
        )
      }

      const byJolly = new Map<string, typeof services>
      for (const s of services) {
        if (!byJolly.has(s.manager_id)) byJolly.set(s.manager_id, [])
        byJolly.get(s.manager_id)!.push(s)
      }

      const cards: JollyCleaningCard[] = []
      for (const [jollyId, jollyServices] of Array.from(byJolly.entries())) {
        const p = profileMap[jollyId]
        if (!p) continue
        const first = jollyServices[0]!
        const r = ratingMap[jollyId] ?? { thumbs_up: 0, thumbs_down: 0 }
        cards.push({
          jolly_id: jollyId,
          avatar_url: p.avatar_url ?? null,
          full_name: p.full_name ?? null,
          username: p.username ?? null,
          price_per_hour: first.price_per_hour ?? null,
          price_per_service: first.price_per_service ?? null,
          location_country: first.location_country ?? null,
          experience_years: first.experience_years ?? null,
          thumbs_up: r.thumbs_up,
          thumbs_down: r.thumbs_down,
          service_id: first.id,
        })
      }
      setJollyCleaning(cards)
    } catch (e) {
      console.error("Error loading Jolly cleaning feed:", e)
      setJollyCleaning([])
    } finally {
      setLoadingJollyCleaning(false)
    }
  }

  const loadProfile = async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
      if (error) throw error
      setProfile(data as Profile)
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCreators = creators.filter(
    (c) =>
      c.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredJollyCleaning = jollyCleaning.filter(
    (j) =>
      !searchQuery ||
      j.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location_country?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const regions = Array.from(
    new Set(
      cleaningRequests
        .map((r) => r.property_city)
        .filter(Boolean) as string[]
    )
  ).sort()

  const filteredRequests = cleaningRequests.filter((r) => {
    const matchSearch =
      !searchQuery ||
      r.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.host_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.service_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.property_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.property_address?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchRegion =
      regionFilter === "all" || r.property_city === regionFilter
    return matchSearch && matchRegion
  })

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Caricamento...</div>
      </div>
    )
  }

  if (!session) return null

  const formatDate = (iso: string | null) => {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  if (isJollyOrCleaner) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto p-4 max-w-6xl">
          <div className="mb-8 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold mb-2">KOL&BED</h1>
            <p className="text-muted-foreground text-lg">
              Richieste di pulizie degli host
            </p>
          </div>

          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                id="search-input"
                placeholder="Cerca per host, servizio, città..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Regione:</span>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {regions.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-muted-foreground">
              Caricamento richieste...
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">
                {cleaningRequests.length === 0
                  ? "Nessuna richiesta di pulizie al momento"
                  : "Nessuna richiesta con i filtri selezionati"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Le richieste degli host appariranno qui quando disponibili.
              </p>
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {filteredRequests.length}{" "}
                {filteredRequests.length === 1
                  ? "richiesta trovata"
                  : "richieste trovate"}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map((req) => (
                  <Card
                    key={req.id}
                    className="overflow-hidden border border-gray-200/60 shadow-xl shadow-gray-200/50 bg-white/98 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40 hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-foreground">
                            {req.host_name || req.host_username || "Host"}
                          </h3>
                          {req.host_username && (
                            <p className="text-sm text-muted-foreground truncate">
                              @{req.host_username}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="font-medium text-foreground mb-1">
                        {req.service_title || "Pulizie"}
                      </p>

                      {req.property_city && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {[req.property_city, req.property_address]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(req.requested_date)}
                      </div>

                      {req.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {req.description}
                        </p>
                      )}

                      {req.price != null && (
                        <p className="text-sm font-medium mb-4">€{req.price}</p>
                      )}

                      <Button
                        asChild
                        className="w-full rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/dashboard/jolly`}>
                          Vai alla dashboard
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-8 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KOL&BED</h1>
          <p className="text-muted-foreground text-lg">
            La piattaforma che connette Key Opinion Leaders e strutture ricettive
          </p>
          {isHost && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant={viewMode === "creators" ? "default" : "outline"}
                onClick={() => setViewMode("creators")}
                className="rounded-2xl"
              >
                <Users className="w-4 h-4 mr-2" />
                Creator
              </Button>
              <Button
                variant={viewMode === "pulizie" ? "default" : "outline"}
                onClick={() => setViewMode("pulizie")}
                className="rounded-2xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Richiedi pulizie
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              id="search-input"
              placeholder={
                viewMode === "pulizie"
                  ? "Cerca per nome, username o paese..."
                  : "Cerca creator per nome o username..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-12 rounded-2xl"
            />
          </div>
        </div>

        {viewMode === "pulizie" ? (
          loadingJollyCleaning ? (
            <div className="py-12 text-center text-muted-foreground">
              Caricamento...
            </div>
          ) : filteredJollyCleaning.length === 0 ? (
            <Card className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">
                {jollyCleaning.length === 0
                  ? "Nessun Jolly con servizi di pulizie al momento"
                  : "Nessun risultato con i filtri selezionati"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                I Jolly che offrono pulizie appariranno qui.
              </p>
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {filteredJollyCleaning.length}{" "}
                {filteredJollyCleaning.length === 1 ? "Jolly trovato" : "Jolly trovati"}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJollyCleaning.map((j) => (
                  <Card
                    key={j.jolly_id}
                    className="overflow-hidden border border-gray-200/60 shadow-xl shadow-gray-200/50 bg-white/98 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer"
                    onClick={() => router.push(`/profile/${j.jolly_id}?request=cleaning&service=${j.service_id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-200/60">
                          {j.avatar_url ? (
                            <Image
                              src={j.avatar_url}
                              alt={j.username || j.full_name || "Jolly"}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate text-foreground">
                            {j.full_name || j.username || "Jolly"}
                          </h3>
                          {j.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              @{j.username}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {j.price_per_hour != null && (
                            <span className="text-sm font-semibold">
                              €{j.price_per_hour}/ora
                            </span>
                          )}
                          {j.price_per_service != null && (
                            <span className="text-sm font-semibold">
                              €{j.price_per_service}/servizio
                            </span>
                          )}
                        </div>
                        {j.location_country && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {j.location_country}
                          </div>
                        )}
                        {j.experience_years != null && (
                          <p className="text-sm text-muted-foreground">
                            {j.experience_years} anni di esperienza
                          </p>
                        )}
                        <div className="flex items-center gap-4 pt-2">
                          <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <ThumbsUp className="w-4 h-4" />
                            {j.thumbs_up}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                            <ThumbsDown className="w-4 h-4" />
                            {j.thumbs_down}
                          </span>
                        </div>
                      </div>
                      <Button asChild className="w-full rounded-2xl" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/profile/${j.jolly_id}?request=cleaning&service=${j.service_id}`}>
                          Vedi profilo e richiedi
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )
        ) : loadingData ? (
          <div className="py-12 text-center text-muted-foreground">
            Caricamento...
          </div>
        ) : filteredCreators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "Nessun creator trovato" : "Nessun creator registrato"}
            </p>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {filteredCreators.length}{" "}
              {filteredCreators.length === 1 ? "creator trovato" : "creators trovati"}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator) => (
                <Card
                  key={creator.id}
                  className="overflow-hidden border border-gray-200/60 shadow-xl shadow-gray-200/50 bg-white/98 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200/40 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer"
                  onClick={() => router.push(`/profile/${creator.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-200/60">
                        {creator.avatar_url ? (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.username || creator.full_name || "Creator"}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate text-foreground">
                          {creator.full_name || creator.username || "Creator"}
                        </h3>
                        {creator.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{creator.username}
                          </p>
                        )}
                      </div>
                    </div>

                    {creator.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {creator.bio}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-3 border border-blue-100/50 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Follower</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {(creator.total_followers || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-3 border border-purple-100/50 dark:border-purple-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">Views</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {(creator.profile_views || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {creator.social_accounts && creator.social_accounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {creator.social_accounts.slice(0, 3).map((account, idx) => {
                          const Icon =
                            account.platform === "instagram"
                              ? Instagram
                              : account.platform === "youtube"
                                ? Youtube
                                : null
                          return Icon ? (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border border-gray-200/50 dark:border-gray-700/50"
                            >
                              <Icon className="h-3 w-3 text-foreground" />
                              <span className="font-medium text-foreground">
                                {account.follower_count.toLocaleString()}
                              </span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}

                    <Button asChild className="w-full rounded-2xl" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/profile/${creator.id}`}>
                        Vedi Profilo
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
