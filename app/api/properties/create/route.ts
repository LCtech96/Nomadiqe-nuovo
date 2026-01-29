import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione NextAuth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      title,
      description,
      property_type,
      address,
      city,
      country,
      latitude,
      longitude,
      price_per_night,
      max_guests,
      bedrooms,
      bathrooms,
      location_data,
      amenities,
      images,
      video_url,
      legal_document_url,
    } = body

    // Valida i campi obbligatori
    if (!name || !property_type || !address || !city || !country || !price_per_night || !max_guests) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti" },
        { status: 400 }
      )
    }

    // Usa il service role client per bypassare RLS (solo dopo aver verificato l'autenticazione)
    // Questo è sicuro perché abbiamo già verificato che l'utente è autenticato con NextAuth
    // e che owner_id corrisponde a session.user.id
    const supabase = createSupabaseAdminClient()

    const basePayload = {
      owner_id: session.user.id,
      name,
      title: title || name,
      description,
      property_type,
      address,
      city,
      country,
      latitude: latitude || null,
      longitude: longitude || null,
      price_per_night: parseFloat(price_per_night),
      max_guests: parseInt(max_guests),
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      location_data: location_data || null,
      amenities: amenities || [],
      images: images || [],
      video_url: video_url || null,
    }

    const payloadWithLegal = legal_document_url
      ? { ...basePayload, legal_document_url }
      : basePayload

    let { data, error } = await supabase
      .from("properties")
      .insert(payloadWithLegal)
      .select()
      .single()

    if (error && legal_document_url && (error.code === "42703" || error.message?.includes("legal_document_url"))) {
      const retry = await supabase
        .from("properties")
        .insert(basePayload)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error("Error creating property:", error)
      return NextResponse.json(
        { error: error.message || "Errore nella creazione della proprietà" },
        { status: 500 }
      )
    }

    // Traduci e salva le traduzioni in background (non bloccare la creazione)
    if (data?.id) {
      // Salva prima la traduzione italiana
      try {
        await supabase
          .from("property_translations")
          .upsert({
            property_id: data.id,
            locale: "it",
            name: name,
            description: description || null,
          }, {
            onConflict: "property_id,locale",
          })
      } catch (err) {
        console.warn("Could not save Italian translation:", err)
      }

      // Avvia traduzione automatica in background (non bloccare la risposta)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/properties/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: data.id,
          name: name,
          description: description || null,
        }),
      }).catch((err) => {
        console.warn("Background translation failed:", err)
      })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/properties/create:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
