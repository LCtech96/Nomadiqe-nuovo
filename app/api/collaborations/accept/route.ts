import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const REQUIRED_POINTS_FOR_FREE_STAY = 2000

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json()
    const { collaborationId } = body

    if (!collaborationId) {
      return NextResponse.json({ error: "collaborationId richiesto" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Carica la collaborazione
    const { data: collaboration, error: collabError } = await supabase
      .from("collaborations")
      .select(`
        *,
        creator:profiles!collaborations_creator_id_fkey(id, points, username, full_name),
        host:profiles!collaborations_host_id_fkey(id, username, full_name)
      `)
      .eq("id", collaborationId)
      .single()

    if (collabError || !collaboration) {
      return NextResponse.json({ error: "Collaborazione non trovata" }, { status: 404 })
    }

    // Verifica che l'utente sia l'host che può accettare
    if (collaboration.host_id !== session.user.id) {
      return NextResponse.json(
        { error: "Non hai il permesso di accettare questa collaborazione" },
        { status: 403 }
      )
    }

    // Verifica che lo status sia pending
    if (collaboration.status !== "pending") {
      return NextResponse.json(
        { error: "Questa collaborazione è già stata gestita" },
        { status: 400 }
      )
    }

    // Verifica che il tipo sia free_stay
    if (collaboration.collaboration_type !== "free_stay") {
      return NextResponse.json(
        { error: "Il sistema di punti è disponibile solo per collaborazioni FREE STAY" },
        { status: 400 }
      )
    }

    // Verifica che il creator abbia abbastanza punti
    const creatorPoints = collaboration.creator?.points || 0
    if (creatorPoints < REQUIRED_POINTS_FOR_FREE_STAY) {
      return NextResponse.json(
        {
          error: "Il creator non ha abbastanza punti per questa collaborazione",
          details: {
            required: REQUIRED_POINTS_FOR_FREE_STAY,
            available: creatorPoints,
            creator: {
              username: collaboration.creator?.username || "Creator",
              full_name: collaboration.creator?.full_name || null,
            },
          },
        },
        { status: 400 }
      )
    }

    // Aggiorna lo status della collaborazione
    // Il trigger SQL si occuperà di assegnare i punti automaticamente
    const { error: updateError } = await supabase
      .from("collaborations")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", collaborationId)

    if (updateError) {
      console.error("Error updating collaboration:", updateError)
      return NextResponse.json(
        { error: "Impossibile accettare la collaborazione" },
        { status: 500 }
      )
    }

    // Invia notifica al creator
    try {
      await supabase.from("pending_notifications").insert({
        user_id: collaboration.creator_id,
        notification_type: "collaboration",
        title: "🎉 Collaborazione accettata!",
        message: `La tua collaborazione con ${collaboration.host?.full_name || collaboration.host?.username || "l'host"} è stata accettata!`,
        url: "/dashboard/creator",
        data: {
          type: "collaboration_accepted",
          collaboration_id: collaborationId,
          host_id: collaboration.host_id,
        },
      })
    } catch (notifError) {
      console.error("Error sending notification (non critico):", notifError)
      // Non bloccare se la notifica fallisce
    }

    return NextResponse.json({
      success: true,
      message: "Collaborazione accettata con successo",
      collaborationId,
    })
  } catch (error: any) {
    console.error("Error accepting collaboration:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

