import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/calendar/ical/[propertyId]
 * Restituisce un feed iCal con le date bloccate (closed, kolbed) per import in Airbnb/Booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const propertyId = params.propertyId
    if (!propertyId) {
      return new NextResponse("propertyId richiesto", { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: property } = await supabase
      .from("properties")
      .select("id, name, title")
      .eq("id", propertyId)
      .single()

    if (!property) {
      return new NextResponse("Proprietà non trovata", { status: 404 })
    }

    const { data: dates } = await supabase
      .from("property_daily_pricing")
      .select("date, status")
      .eq("property_id", propertyId)
      .in("status", ["closed", "kolbed"])
      .order("date")

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nomadiqe//Calendar//IT",
      "CALSCALE:GREGORIAN",
    ]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const row of dates || []) {
      const d = new Date(row.date)
      if (d < today) continue
      const dateStr = row.date.replace(/-/g, "")
      const nextDay = new Date(d)
      nextDay.setDate(nextDay.getDate() + 1)
      const endStr = nextDay.toISOString().split("T")[0].replace(/-/g, "")
      lines.push(
        "BEGIN:VEVENT",
        `UID:nomadiqe-${propertyId}-${row.date}@nomadiqe.com`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${endStr}`,
        "SUMMARY:Non disponibile",
        "END:VEVENT"
      )
    }

    lines.push("END:VCALENDAR")
    const ics = lines.join("\r\n")

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="nomadiqe-${propertyId}.ics"`,
      },
    })
  } catch (e) {
    console.error("iCal export error:", e)
    return new NextResponse("Errore", { status: 500 })
  }
}
