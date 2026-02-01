import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/properties/[id]/calendar-sync
 * Salva gli URL iCal per Airbnb e Booking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const propertyId = params.id
    if (!propertyId) {
      return NextResponse.json({ error: "ID proprietà richiesto" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { airbnb_ical_url, booking_ical_url } = body as {
      airbnb_ical_url?: string | null
      booking_ical_url?: string | null
    }

    const supabase = createSupabaseAdminClient()

    const { data: property, error: checkErr } = await supabase
      .from("properties")
      .select("owner_id")
      .eq("id", propertyId)
      .single()

    if (checkErr || !property) {
      return NextResponse.json({ error: "Proprietà non trovata" }, { status: 404 })
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const updates: Record<string, string | null> = {}
    if (airbnb_ical_url !== undefined) {
      updates.airbnb_ical_url = airbnb_ical_url && String(airbnb_ical_url).trim()
        ? String(airbnb_ical_url).trim()
        : null
    }
    if (booking_ical_url !== undefined) {
      updates.booking_ical_url = booking_ical_url && String(booking_ical_url).trim()
        ? String(booking_ical_url).trim()
        : null
    }

    const { error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", propertyId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Calendar sync save error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
