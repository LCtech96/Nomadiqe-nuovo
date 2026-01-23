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

    // Inserisci la proprietà
    const { data, error } = await supabase
      .from("properties")
      .insert({
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
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating property:", error)
      return NextResponse.json(
        { error: error.message || "Errore nella creazione della proprietà" },
        { status: 500 }
      )
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
