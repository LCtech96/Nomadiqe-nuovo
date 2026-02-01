"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_PRICE = 69

interface PropertyPricingCalendarProps {
  selectedDates: string[]
  onDatesChange: (dates: string[]) => void
  datePrices?: Record<string, number>
  onDatePriceChange?: (date: string, price: number) => void
}

export default function PropertyPricingCalendar({
  selectedDates,
  onDatesChange,
  datePrices = {},
  onDatePriceChange,
}: PropertyPricingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState("")

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

  const isPast = (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))

  const toggleDate = (date: Date | null) => {
    if (!date || isPast(date)) return
    const dateStr = formatDate(date)
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr))
    } else {
      onDatesChange([...selectedDates, dateStr])
    }
  }

  const startEditPrice = (date: Date, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!date || isPast(date)) return
    const dateStr = formatDate(date)
    const price = datePrices[dateStr] ?? DEFAULT_PRICE
    setEditingDate(dateStr)
    setEditPrice(price.toString())
  }

  const applyEditPrice = () => {
    if (!editingDate || !onDatePriceChange) {
      setEditingDate(null)
      return
    }
    const val = parseFloat(editPrice.replace(",", "."))
    if (!isNaN(val) && val > 0) {
      onDatePriceChange(editingDate, val)
    }
    setEditingDate(null)
  }

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ]

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Prezzo predefinito: <strong>69 €/notte</strong>. Clicca sulle date per selezionarle come disponibili. Doppio click per impostare un prezzo diverso.
      </p>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
        <Button type="button" variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((d) => (
          <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const dateStr = formatDate(date)
          const selected = selectedDates.includes(dateStr)
          const past = isPast(date)
          const price = datePrices[dateStr] ?? DEFAULT_PRICE
          const isEditing = editingDate === dateStr

          return (
            <div
              key={dateStr}
              className="relative"
            >
              <button
                type="button"
                onClick={() => toggleDate(date)}
                onDoubleClick={(e) => startEditPrice(date, e)}
                disabled={past}
                className={`
                  w-full py-2 rounded text-sm transition-colors
                  ${past ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                  ${selected ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  ${!past && !selected ? "bg-muted/50 hover:bg-muted" : ""}
                `}
              >
                {date.getDate()}
                {selected && !past && <span className="block text-[10px] opacity-90">€{price}</span>}
              </button>
              {isEditing && onDatePriceChange && (
                <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-popover border rounded shadow-lg flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyEditPrice()}
                    className="w-20 px-2 py-1 text-sm rounded border bg-background"
                  />
                  <Button type="button" size="sm" onClick={applyEditPrice}>Ok</Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { DEFAULT_PRICE }
