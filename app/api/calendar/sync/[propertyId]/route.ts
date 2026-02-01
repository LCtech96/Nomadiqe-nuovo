import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import ical from "node-ical"

export const dynamic = "force-dynamic"

/**
 * POST /api/calendar/sync/[propertyId]
 * Fetcha gli URL iCal di Airbnb/Booking, parsifica le date occupate e le blocca in Nomadiqe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const propertyId = params.propertyId
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId richiesto" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id, owner_id, airbnb_ical_url, booking_ical_url")
      .eq("id", propertyId)
      .single()

    if (propErr || !property) {
      return NextResponse.json({ error: "Proprietà non trovata" }, { status: 404 })
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const urls: string[] = []
    if (property.airbnb_ical_url?.trim()) urls.push(property.airbnb_ical_url.trim())
    if (property.booking_ical_url?.trim()) urls.push(property.booking_ical_url.trim())

    if (urls.length === 0) {
      return NextResponse.json({
        error: "Nessun URL iCal configurato. Aggiungi almeno un link Airbnb o Booking.",
      }, { status: 400 })
    }

    const blockedDates = new Set<string>()

    for (const url of urls) {
      try {
        const res = await fetch(url, { next: { revalidate: 0 } })
        if (!res.ok) continue
        const text = await res.text()
        const data = ical.parseICS(text)

        for (const key in data) {
          const ev = data[key]
          if (ev.type !== "VEVENT" || !ev.start || !ev.end) continue
          const start = new Date(ev.start)
          const end = new Date(ev.end)
          const current = new Date(start)
          while (current < end) {
            blockedDates.add(current.toISOString().split("T")[0])
            current.setDate(current.getDate() + 1)
          }
        }
      } catch (e) {
        console.warn("Error fetching iCal:", url, e)
      }
    }

    for (const dateStr of Array.from(blockedDates)) {
      await supabase.from("property_daily_pricing").upsert(
        {
          property_id: propertyId,
          date: dateStr,
          status: "closed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id,date" }
      )
    }

    return NextResponse.json({
      success: true,
      blockedCount: blockedDates.size,
    })
  } catch (e) {
    console.error("Calendar sync error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore sync" },
      { status: 500 }
    )
  }
}
