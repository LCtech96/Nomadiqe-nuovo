"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/context"
import Link from "next/link"
import {
  Plus,
  Briefcase,
  CheckCircle,
  Inbox,
  Pencil,
  Trash2,
  Clock,
  User,
  Calendar,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const LOCALE_MAP: Record<string, string> = {
  it: "it-IT",
  en: "en-US",
  ru: "ru-RU",
  fr: "fr-FR",
  de: "de-DE",
}

interface Service {
  id: string
  service_type: string
  title: string
  description: string
  price_per_hour: number | null
  price_per_service: number | null
  is_active: boolean
  request_count: number
}

interface ServiceRequest {
  id: string
  host_id: string
  service_id: string
  description: string | null
  requested_date: string | null
  status: string
  price: number | null
  created_at: string
  service_title?: string
  service_type?: string
  host_name?: string
  host_username?: string
}

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso)
  const localeTag = LOCALE_MAP[locale] || "it-IT"
  return d.toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—"
  const localeTag = LOCALE_MAP[locale] || "it-IT"
  return new Date(iso).toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function JollyDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { t, locale } = useI18n()
  const supabase = createSupabaseClient()
  const [services, setServices] = useState<Service[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    const uid = session?.user?.id
    if (!uid) return

    try {
      const [servicesRes, requestsRes] = await Promise.all([
        supabase
          .from("manager_services")
          .select("*")
          .eq("manager_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_requests")
          .select("id, host_id, service_id, description, requested_date, status, price, created_at")
          .eq("manager_id", uid)
          .order("created_at", { ascending: false }),
      ])

      if (servicesRes.error) throw servicesRes.error
      if (requestsRes.error) throw requestsRes.error

      const servicesData = servicesRes.data || []
      const requestsData = requestsRes.data || []

      const serviceMap = Object.fromEntries(
        servicesData.map((s) => [s.id, { title: s.title, service_type: s.service_type }])
      )
      const hostIds = Array.from(new Set(requestsData.map((r) => r.host_id)))
      let hostMap: Record<string, { full_name?: string; username?: string }> = {}
      if (hostIds.length > 0) {
        const { data: hosts } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", hostIds)
        if (hosts) hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]))
      }

      const servicesWithCount = await Promise.all(
        servicesData.map(async (s) => {
          const { count } = await supabase
            .from("service_requests")
            .select("*", { count: "exact", head: true })
            .eq("service_id", s.id)
            .eq("status", "completed")
          return {
            ...s,
            request_count: count || 0,
          }
        })
      )

      const enrichedRequests: ServiceRequest[] = requestsData.map((r) => {
        const svc = serviceMap[r.service_id]
        const host = hostMap[r.host_id]
        return {
          ...r,
          service_title: svc?.title,
          service_type: svc?.service_type,
          host_name: host?.full_name || undefined,
          host_username: host?.username || undefined,
        }
      })

      setServices(servicesWithCount)
      setRequests(enrichedRequests)
    } catch (e) {
      console.error("Error loading Jolly dashboard:", e)
      toast({
        title: t("common.error"),
        description: t("jolly.loadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated" || !session?.user?.id) {
      router.push("/auth/signin")
      setLoading(false)
      return
    }
    loadData()
  }, [status, session?.user?.id])

  const handleDeleteService = async (id: string) => {
    setDeleting(true)
    try {
      const { error } = await supabase.from("manager_services").delete().eq("id", id).eq("manager_id", session!.user!.id!)
      if (error) throw error
      toast({ title: t("jolly.deletedSuccess"), description: t("jolly.deletedDesc") })
      setDeleteId(null)
      loadData()
    } catch (e: any) {
      toast({
        title: t("common.error"),
        description: e.message || t("jolly.deleteError"),
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("dashboard.loading")}</p>
      </div>
    )
  }

  if (status === "unauthenticated" || !session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 p-6 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("jolly.dashboardTitle")}</h1>
            <p className="text-muted-foreground">{t("jolly.dashboardSubtitle")}</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/jolly/services/new">
              <Plus className="w-4 h-4 mr-2" />
              {t("dashboard.newService")}
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("jolly.totalRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{requests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("jolly.pending")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{requests.filter((r) => r.status === "pending").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.activeServices")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{services.filter((s) => s.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.totalServices")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{services.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Richieste di servizio ricevute */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              {t("jolly.requestsReceived")}
            </CardTitle>
            <CardDescription>{t("jolly.requestsReceivedDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">{t("jolly.noRequestsYet")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("jolly.noRequestsHint")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium">
                          {req.service_title || t("jolly.service")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {req.service_type ? t(`jolly.serviceType.${req.service_type}`) || req.service_type : "—"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            req.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : req.status === "accepted"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {t(`jolly.status.${req.status}`) || req.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {req.host_name || req.host_username || t("jolly.host")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(req.requested_date, locale)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDateTime(req.created_at, locale)}
                        </span>
                        {req.price != null && (
                          <span className="font-medium text-foreground">€{req.price}</span>
                        )}
                      </div>
                      {req.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Servizi offerti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {t("jolly.servicesYouOffer")}
            </CardTitle>
            <CardDescription>{t("jolly.editOrDeleteServices")}</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{t("dashboard.noServices")}</p>
                <Button asChild>
                  <Link href="/dashboard/jolly/services/new">{t("dashboard.createFirstService")}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base leading-tight">{s.title}</CardTitle>
                        {s.is_active && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                      </div>
                      <CardDescription>
                        {t(`jolly.serviceType.${s.service_type}`) || s.service_type.replace("_", " ")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {s.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-sm">
                        {s.price_per_hour != null && (
                          <span>
                            <strong>€{s.price_per_hour}</strong>{t("jolly.perHour")}
                          </span>
                        )}
                        {s.price_per_service != null && (
                          <span>
                            <strong>€{s.price_per_service}</strong>{t("jolly.perService")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.request_count} {t("jolly.requestsCompleted")}
                      </p>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/dashboard/jolly/services/${s.id}`} className="inline-flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" />
                            {t("common.edit")}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("jolly.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("jolly.deleteConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDeleteService(deleteId)}
              disabled={deleting}
            >
              {deleting ? t("jolly.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
