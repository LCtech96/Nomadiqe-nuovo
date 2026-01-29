import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { propertyId, latitude: latIn, longitude: lngIn } = body as {
      propertyId?: string
      latitude?: number | string
      longitude?: number | string
    }

    const latitude = typeof latIn === "number" ? latIn : parseFloat(String(latIn ?? ""))
    const longitude = typeof lngIn === "number" ? lngIn : parseFloat(String(lngIn ?? ""))

    if (!propertyId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Parametri mancanti o non validi: propertyId, latitude, longitude" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("owner_id")
      .eq("id", propertyId)
      .single()

    if (fetchError || !property) {
      return NextResponse.json({ error: "Proprietà non trovata" }, { status: 404 })
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from("properties")
      .update({
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId)
      .eq("owner_id", session.user.id)

    if (updateError) {
      console.error("Error updating property location:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Errore nell'aggiornamento della posizione" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error in POST /api/properties/update-location:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
