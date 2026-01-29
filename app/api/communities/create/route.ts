import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    // Verifica la sessione NextAuth
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, city, country, invited_host_ids } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Il nome della community è obbligatorio" },
        { status: 400 }
      )
    }

    // Crea un client Supabase admin per bypassare RLS
    const supabaseAdmin = createSupabaseAdminClient()

    // Verifica che l'utente esista e abbia il ruolo host o jolly
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profilo non trovato" },
        { status: 404 }
      )
    }

    if (profile.role !== "host" && profile.role !== "jolly") {
      return NextResponse.json(
        { error: "Solo gli host e i jolly possono creare communities" },
        { status: 403 }
      )
    }

    // Crea la community usando il client admin
    console.log("🏗️ Creazione community:", { name: name.trim(), created_by: session.user.id, city, country })
    
    const { data: community, error: communityError } = await supabaseAdmin
      .from("host_communities")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: session.user.id,
        city: city || null,
        country: country || null,
      })
      .select()
      .single()

    if (communityError) {
      console.error("❌ Error creating community:", communityError)
      return NextResponse.json(
        { error: communityError.message || "Errore nella creazione della community" },
        { status: 500 }
      )
    }
    
    console.log("✅ Community creata con successo:", community.id)

    // Crea gli inviti se sono stati forniti
    if (invited_host_ids && Array.isArray(invited_host_ids) && invited_host_ids.length > 0) {
      console.log("📧 Creazione inviti per community:", community.id, "Hosts:", invited_host_ids)
      
      const invitations = invited_host_ids.map((hostId: string) => ({
        community_id: community.id,
        invited_host_id: hostId,
        invited_by: session.user.id,
        status: "pending",
      }))

      const { data: insertedInvitations, error: inviteError } = await supabaseAdmin
        .from("host_community_invitations")
        .insert(invitations)
        .select()

      if (inviteError) {
        console.error("❌ Error creating invitations:", inviteError)
        // Non bloccare la risposta se gli inviti falliscono, ma logga l'errore
        // La community è già stata creata con successo
      } else {
        console.log("✅ Inviti creati con successo:", insertedInvitations?.length || 0)
      }
    }

    return NextResponse.json({ community }, { status: 201 })
  } catch (error: any) {
    console.error("Error in create community API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
