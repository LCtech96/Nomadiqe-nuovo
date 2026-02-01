import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/support/requests/[id] - Dettaglio richiesta con messaggi
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createSupabaseAdminClient()

    const { data: req, error: reqErr } = await supabase
      .from("support_requests")
      .select("id, subject, status, user_id, created_at")
      .eq("id", id)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (req.user_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const { data: messages, error: msgErr } = await supabase
      .from("support_messages")
      .select("id, message, attachment_urls, is_from_admin, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true })

    if (msgErr) throw msgErr

    return NextResponse.json({
      request: req,
      messages: messages || [],
    })
  } catch (e: unknown) {
    console.error("Support request get error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
