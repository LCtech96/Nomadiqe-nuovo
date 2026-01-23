"use client"

import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface KolBedCalendarSelectorProps {
  hostId: string
  propertyId?: string
  selectedDates: string[]
  onDatesChange: (dates: string[]) => void
}

export default function KolBedCalendarSelector({
  hostId,
  propertyId,
  selectedDates,
  onDatesChange,
}: KolBedCalendarSelectorProps) {
  const supabase = createSupabaseClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookings()
  }, [hostId, propertyId, currentMonth])

  const loadBookings = async () => {
    try {
      // Carica prenotazioni per le proprietà dell'host
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", hostId)

      if (!propertiesData || propertiesData.length === 0) {
        setBookings([])
        setLoading(false)
        return
      }

      const propertyIds = propertyId
        ? [propertyId]
        : propertiesData.map((p) => p.id)

      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3, 0)

      const { data, error } = await supabase
        .from("bookings")
        .select("id, property_id, check_in, check_out, status")
        .in("property_id", propertyIds)
        .in("status", ["pending", "confirmed", "completed"])
        .lte("check_in", endDate.toISOString().split("T")[0])
        .gte("check_out", startDate.toISOString().split("T")[0])

      if (error) throw error

      // Espandi le prenotazioni in giorni
      const bookingDays: any[] = []
      ;(data || []).forEach((booking) => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        const currentDate = new Date(checkIn)

        while (currentDate < checkOut) {
          bookingDays.push({
            date: currentDate.toISOString().split("T")[0],
            property_id: booking.property_id,
            is_booking: true,
          })
          currentDate.setDate(currentDate.getDate() + 1)
        }
      })

      setBookings(bookingDays)
    } catch (error) {
      console.error("Error loading bookings:", error)
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

    const days = []
    
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Aggiungi i giorni del mese
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getDayStatus = (date: Date | null) => {
    if (!date) return null

    const dateStr = date.toISOString().split("T")[0]
    const isBooking = bookings.some((b) => b.date === dateStr)
    const isSelected = selectedDates.includes(dateStr)
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

    if (isPast) return "past"
    if (isBooking) return "booked"
    if (isSelected) return "selected"
    return "available"
  }

  const toggleDate = (date: Date | null) => {
    if (!date) return

    const dateStr = date.toISOString().split("T")[0]
    const status = getDayStatus(date)

    // Non permettere selezione di date passate o prenotate
    if (status === "past" || status === "booked") return

    if (status === "selected") {
      onDatesChange(selectedDates.filter((d) => d !== dateStr))
    } else {
      onDatesChange([...selectedDates, dateStr])
    }
  }

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ]

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const days = getDaysInMonth(currentMonth)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Caricamento calendario...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:bg-gray-900/98">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Seleziona le date disponibili per KOL&BED
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Clicca sulle date per selezionarle. Le date prenotate sono bloccate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Navigazione mese */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400 rounded"></div>
              <span className="dark:text-gray-300">Selezionata</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
              <span className="dark:text-gray-300">Disponibile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"></div>
              <span className="dark:text-gray-300">Prenotata</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded"></div>
              <span>Passata</span>
            </div>
          </div>

          {/* Calendario */}
          <div className="grid grid-cols-7 gap-1">
            {/* Intestazioni giorni */}
            {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground dark:text-gray-400 p-2">
                {day}
              </div>
            ))}

            {/* Giorni */}
            {days.map((date, index) => {
              const status = getDayStatus(date)
              const isToday = date && date.toDateString() === new Date().toDateString()

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDate(date)}
                  disabled={!date || status === "past" || status === "booked"}
                  className={`
                    aspect-square p-1 flex items-center justify-center text-sm rounded
                    transition-colors
                    ${!date ? "bg-transparent cursor-default" : "cursor-pointer"}
                    ${status === "selected" ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400" : ""}
                    ${status === "available" ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50" : ""}
                    ${status === "booked" ? "bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 cursor-not-allowed opacity-50" : ""}
                    ${status === "past" ? "bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 cursor-not-allowed opacity-50" : ""}
                    ${isToday ? "ring-2 ring-blue-500" : ""}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {date && (
                    <span className={isToday ? "font-bold text-blue-600 dark:text-blue-400" : ""}>
                      {date.getDate()}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Date selezionate */}
          {selectedDates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                Date selezionate ({selectedDates.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDates
                  .sort()
                  .slice(0, 10)
                  .map((date) => (
                    <Badge key={date} variant="secondary">
                      {new Date(date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Badge>
                  ))}
                {selectedDates.length > 10 && (
                  <Badge variant="outline">+{selectedDates.length - 10} altre</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
