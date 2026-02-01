import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/support/requests/[id]/messages - Aggiungi messaggio (utente)
 * Body: { message, attachmentUrls?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { message, attachmentUrls } = body as {
      message?: string
      attachmentUrls?: string[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Messaggio obbligatorio" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: req, error: reqErr } = await supabase
      .from("support_requests")
      .select("id, user_id, status")
      .eq("id", id)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (req.user_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    if (req.status === "closed") {
      return NextResponse.json(
        { error: "Questa richiesta è stata chiusa" },
        { status: 400 }
      )
    }

    const urls = Array.isArray(attachmentUrls) ? attachmentUrls : []
    const { error: msgErr } = await supabase.from("support_messages").insert({
      request_id: id,
      is_from_admin: false,
      author_id: session.user.id,
      message: message.trim(),
      attachment_urls: urls,
    })

    if (msgErr) throw msgErr

    await supabase
      .from("support_requests")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Support message add error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
