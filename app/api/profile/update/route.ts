import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/profile/update
 * Aggiorna il profilo dell'utente autenticato.
 * Usa il service role Supabase per evitare problemi con auth.uid() quando
 * l'utente fa login con NextAuth (es. Google) senza sessione Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json()
    const {
      full_name,
      username,
      bio,
      avatar_url,
      username_changed_at,
      presentation_video_url,
    } = body

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updatePayload.full_name = full_name ?? null
    if (username !== undefined) updatePayload.username = username ?? null
    if (bio !== undefined) updatePayload.bio = bio ?? null
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url ?? null
    if (username_changed_at !== undefined) updatePayload.username_changed_at = username_changed_at ?? null
    if (presentation_video_url !== undefined) updatePayload.presentation_video_url = presentation_video_url ?? null

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", session.user.id)

    if (error) {
      console.error("Profile update error:", error)
      return NextResponse.json(
        { error: error.message || "Errore durante l'aggiornamento del profilo" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Profile update API error:", e)
    return NextResponse.json(
      { error: "Errore interno durante l'aggiornamento del profilo" },
      { status: 500 }
    )
  }
}
