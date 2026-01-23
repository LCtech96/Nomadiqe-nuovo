import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    // Verifica autenticazione NextAuth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get("id")

    if (!propertyId) {
      return NextResponse.json(
        { error: "ID proprietà mancante" },
        { status: 400 }
      )
    }

    // Usa il service role client per bypassare RLS
    const supabase = createSupabaseAdminClient()

    // Verifica che la proprietà appartenga all'utente
    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("owner_id")
      .eq("id", propertyId)
      .single()

    if (fetchError || !property) {
      return NextResponse.json(
        { error: "Proprietà non trovata" },
        { status: 404 }
      )
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 403 }
      )
    }

    // Elimina tutte le dipendenze prima della proprietà
    // (Le foreign keys con ON DELETE CASCADE dovrebbero gestire questo, ma eliminiamo manualmente per sicurezza)

    // Elimina bookings
    await supabase
      .from("bookings")
      .delete()
      .eq("property_id", propertyId)

    // Elimina reviews
    await supabase
      .from("reviews")
      .delete()
      .eq("property_id", propertyId)

    // Elimina property availability
    await supabase
      .from("property_availability")
      .delete()
      .eq("property_id", propertyId)

    // Elimina collaborations
    await supabase
      .from("collaborations")
      .delete()
      .eq("property_id", propertyId)

    // Elimina saved properties
    await supabase
      .from("saved_properties")
      .delete()
      .eq("property_id", propertyId)

    // Elimina la proprietà
    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)
      .eq("owner_id", session.user.id)

    if (deleteError) {
      console.error("Error deleting property:", deleteError)
      return NextResponse.json(
        { error: deleteError.message || "Errore nell'eliminazione della proprietà" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error in DELETE /api/properties/delete:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
