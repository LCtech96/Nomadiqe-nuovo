"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DateStatus = "available" | "closed" | "kolbed"

interface HostAvailabilityCalendarProps {
  hostId: string
  propertyIds: { id: string; name: string }[]
  supabase: any
  onSave?: () => void
}

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
]

export default function HostAvailabilityCalendar({
  hostId,
  propertyIds,
  supabase,
  onSave,
}: HostAvailabilityCalendarProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    propertyIds[0]?.id ?? null
  )
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateStatus, setDateStatus] = useState<Record<string, DateStatus>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setSelectedPropertyId(propertyIds[0]?.id ?? null)
  }, [propertyIds])

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
    if (isPast(date) || !selectedPropertyId) return
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
        Crea una struttura per gestire il calendario
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Struttura</label>
        <Select
          value={selectedPropertyId ?? ""}
          onValueChange={setSelectedPropertyId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona struttura" />
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

      <p className="text-xs text-muted-foreground">
        <strong>Clic singolo:</strong> disponibile ↔ chiuso.{" "}
        <strong>Doppio clic:</strong> programma KOL&BED.
      </p>

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
        <p className="text-xs text-muted-foreground">Salvataggio...</p>
      )}
    </div>
  )
}
