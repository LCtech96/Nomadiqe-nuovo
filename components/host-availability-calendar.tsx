"use client"

import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HostAvailabilityCalendarProps {
  hostId: string
  propertyId?: string
  onClose?: () => void
}

export default function HostAvailabilityCalendar({
  hostId,
  propertyId,
  onClose,
}: HostAvailabilityCalendarProps) {
  const supabase = createSupabaseClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availability, setAvailability] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAvailability()
    loadBookings()
  }, [hostId, propertyId, currentMonth])

  const loadAvailability = async () => {
    try {
      let query = supabase
        .from("host_availability")
        .select("*")
        .eq("host_id", hostId)
        .eq("available_for_collab", true)

      if (propertyId) {
        query = query.eq("property_id", propertyId)
      }

      // Carica disponibilità per il mese corrente e i prossimi 2 mesi
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3, 0)

      query = query
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])

      const { data, error } = await query

      if (error) throw error
      setAvailability(data || [])
    } catch (error) {
      console.error("Error loading availability:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      // Carica prenotazioni per le proprietà dell'host
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", hostId)

      if (!propertiesData || propertiesData.length === 0) {
        setBookings([])
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
    const isAvailable = availability.some((a) => a.date === dateStr)

    if (isBooking) return "booked"
    if (isAvailable) return "available"
    return "unavailable"
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendario Disponibilità
            </CardTitle>
            <CardDescription>
              Visualizza le disponibilità e le prenotazioni esistenti
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Navigazione mese */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
              <span>Disponibile per collaborazioni</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"></div>
              <span>Prenotato</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded"></div>
              <span>Non disponibile</span>
            </div>
          </div>

          {/* Calendario */}
          <div className="grid grid-cols-7 gap-1">
            {/* Intestazioni giorni */}
            {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {/* Giorni */}
            {days.map((date, index) => {
              const status = getDayStatus(date)
              const isToday = date && date.toDateString() === new Date().toDateString()

              return (
                <div
                  key={index}
                  className={`
                    aspect-square p-1 flex items-center justify-center text-sm
                    ${!date ? "bg-transparent" : ""}
                    ${status === "available" ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" : ""}
                    ${status === "booked" ? "bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" : ""}
                    ${status === "unavailable" ? "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700" : ""}
                    ${isToday ? "ring-2 ring-blue-500" : ""}
                    rounded
                  `}
                >
                  {date && (
                    <span className={isToday ? "font-bold text-blue-600 dark:text-blue-400" : ""}>
                      {date.getDate()}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
