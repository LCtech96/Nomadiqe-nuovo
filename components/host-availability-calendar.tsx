"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/context"

type DateStatus = "available" | "closed" | "kolbed"

interface PropertyWithSync {
  id: string
  name: string
  airbnb_ical_url?: string | null
  booking_ical_url?: string | null
}

interface HostAvailabilityCalendarProps {
  hostId: string
  propertyIds: { id: string; name: string }[]
  propertiesWithSync?: PropertyWithSync[]
  supabase: any
  onSave?: () => void
  onClose?: () => void
  readOnly?: boolean
}

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
]

export default function HostAvailabilityCalendar({
  hostId,
  propertyIds,
  propertiesWithSync,
  supabase,
  onSave,
  onClose,
  readOnly = false,
}: HostAvailabilityCalendarProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    propertyIds[0]?.id ?? null
  )
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateStatus, setDateStatus] = useState<Record<string, DateStatus>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncSectionOpen, setSyncSectionOpen] = useState(false)
  const [airbnbUrl, setAirbnbUrl] = useState("")
  const [bookingUrl, setBookingUrl] = useState("")
  const [savingSync, setSavingSync] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const { t } = useI18n()

  const selectedProp = propertiesWithSync?.find((p) => p.id === selectedPropertyId)

  useEffect(() => {
    setSelectedPropertyId(propertyIds[0]?.id ?? null)
  }, [propertyIds])

  useEffect(() => {
    if (selectedProp) {
      setAirbnbUrl(selectedProp.airbnb_ical_url || "")
      setBookingUrl(selectedProp.booking_ical_url || "")
    }
  }, [selectedProp])

  useEffect(() => {
    if (!selectedPropertyId) {
      setDateStatus({})
      return
    }
    loadDates()
  }, [selectedPropertyId, currentMonth])

  const loadDates = async () => {
    if (!selectedPropertyId) return
    setLoading(true)
    try {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const { data, error } = await supabase
        .from("property_daily_pricing")
        .select("date, status")
        .eq("property_id", selectedPropertyId)
        .gte("date", start.toISOString().split("T")[0])
        .lte("date", end.toISOString().split("T")[0])

      if (error) throw error

      const map: Record<string, DateStatus> = {}
      ;(data || []).forEach((r: { date: string; status: DateStatus }) => {
        map[r.date] = r.status
      })
      setDateStatus(map)
    } catch (e) {
      console.error("Error loading dates:", e)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const formatDate = (d: Date) => d.toISOString().split("T")[0]

  const isPast = (date: Date) =>
    date < new Date(new Date().setHours(0, 0, 0, 0))

  const getStatus = (dateStr: string): DateStatus =>
    dateStatus[dateStr] || "available"

  const cycleStatus = (dateStr: string): DateStatus => {
    const current = getStatus(dateStr)
    if (current === "available") return "closed"
    if (current === "closed") return "available"
    return "available"
  }

  const applyStatusChange = (date: Date, isDouble: boolean) => {
    if (isPast(date) || !selectedPropertyId) return
    const dateStr = formatDate(date)
    const current = getStatus(dateStr)

    let newStatus: DateStatus
    if (isDouble) {
      newStatus = current === "kolbed" ? "available" : "kolbed"
    } else {
      newStatus = current === "kolbed" ? "closed" : cycleStatus(dateStr)
    }

    setDateStatus((prev) => ({ ...prev, [dateStr]: newStatus }))
    saveDate(dateStr, newStatus)
  }

  const handleDateClick = (date: Date) => {
    if (readOnly || isPast(date) || !selectedPropertyId) return
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      applyStatusChange(date, true)
      return
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      applyStatusChange(date, false)
    }, 250)
  }

  const saveDate = async (dateStr: string, status: DateStatus) => {
    if (!selectedPropertyId) return
    setSaving(true)
    try {
      await supabase.from("property_daily_pricing").upsert(
        {
          property_id: selectedPropertyId,
          date: dateStr,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id,date" }
      )
      onSave?.()
    } catch (e) {
      console.error("Error saving date:", e)
    } finally {
      setSaving(false)
    }
  }

  const days = getDaysInMonth(currentMonth)

  const btnClass = (status: DateStatus, past: boolean) => {
    if (past) return "bg-muted text-muted-foreground cursor-not-allowed"
    if (status === "closed") return "bg-red-600 text-white hover:bg-red-700"
    if (status === "kolbed") return "bg-green-600 text-white hover:bg-green-700"
    return "bg-primary/20 text-primary hover:bg-primary/30"
  }

  if (propertyIds.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {t("calendar.createProperty")}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {onClose && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      )}
      <div>
        <label className="text-sm font-medium mb-2 block">{t("calendar.property")}</label>
        <Select
          value={selectedPropertyId ?? ""}
          onValueChange={setSelectedPropertyId}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("calendar.selectProperty")} />
          </SelectTrigger>
          <SelectContent>
            {propertyIds.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          <strong>Clic singolo:</strong> disponibile ↔ chiuso.{" "}
          <strong>Doppio clic:</strong> programma KOL&BED.
        </p>
      )}

      {!readOnly && selectedPropertyId && (
        <div className="border rounded-lg p-4 space-y-4">
          <button
            type="button"
            onClick={() => setSyncSectionOpen(!syncSectionOpen)}
            className="flex items-center gap-2 w-full text-left font-medium"
          >
            <Link2 className="h-4 w-4" />
            {t("calendar.sync.title")}
            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${syncSectionOpen ? "rotate-180" : ""}`} />
          </button>
          {syncSectionOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                {t("calendar.sync.importDesc")}
              </p>
              <div>
                <Label className="text-sm">{t("calendar.sync.airbnbUrl")}</Label>
                <Input
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Da Airbnb: Modifica annuncio → Disponibilità → Esporta calendario
                </p>
              </div>
              <div>
                <Label className="text-sm">URL calendario Booking.com (export)</Label>
                <Input
                  placeholder="https://admin.booking.com/..."
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("calendar.sync.bookingHint")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingSync}
                  onClick={async () => {
                    setSavingSync(true)
                    try {
                      const res = await fetch(`/api/properties/${selectedPropertyId}/calendar-sync`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          airbnb_ical_url: airbnbUrl || null,
                          booking_ical_url: bookingUrl || null,
                        }),
                      })
                      if (!res.ok) throw new Error(await res.text())
                      toast({ title: "Salvato", description: "URL calendario salvati" })
                      onSave?.()
                    } catch (e) {
                      toast({ title: t("dashboard.host.error"), description: (e as Error)?.message, variant: "destructive" })
                    } finally {
                      setSavingSync(false)
                    }
                  }}
                >
                  {savingSync ? t("general.saving") : t("calendar.sync.saveUrls")}
                </Button>
                <Button
                  size="sm"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true)
                    try {
                      const res = await fetch(`/api/calendar/sync/${selectedPropertyId}`, {
                        method: "POST",
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || "Errore")
                      loadDates()
                      onSave?.()
                      toast({ title: t("calendar.sync.synced"), description: t("calendar.sync.blockedDates").replace("{n}", String(data.blockedCount || 0)) })
                    } catch (e) {
                      toast({ title: "Errore sync", description: (e as Error)?.message || "Sincronizzazione fallita", variant: "destructive" })
                    } finally {
                      setSyncing(false)
                    }
                  }}
                >
                  {syncing ? "Sincronizzazione..." : "Sincronizza ora"}
                </Button>
              </div>
              <div>
                <Label className="text-sm">{t("calendar.sync.exportLink")}</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  {t("calendar.sync.exportHint")}
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/calendar/ical/${selectedPropertyId}` : ""}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/api/calendar/ical/${selectedPropertyId}`
                      navigator.clipboard.writeText(url)
                      toast({ title: "Copiato", description: "Link copiato negli appunti" })
                    }}
                  >
                    {t("calendar.sync.copy")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary/20" /> Disponibile viaggiatori
        </span>
        <span className="text-xs flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-600" /> Chiuso
        </span>
        <span className="text-xs flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-600" /> KOL&BED
        </span>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            )
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            )
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((d) => (
          <div key={d} className="font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const dateStr = formatDate(date)
          const status = getStatus(dateStr)
          const past = isPast(date)

          return (
            <button
              key={dateStr}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                handleDateClick(date)
              }}
              disabled={past}
              className={`w-full py-2 rounded text-sm transition-colors ${btnClass(
                status,
                past
              )}`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      {saving && (
        <p className="text-xs text-muted-foreground">{t("general.saving")}</p>
      )}
    </div>
  )
}
