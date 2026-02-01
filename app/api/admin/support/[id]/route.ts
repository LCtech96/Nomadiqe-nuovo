import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/support/[id] - Dettaglio richiesta con messaggi (admin)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const supabase = createSupabaseAdminClient()

    const { data: req, error: reqErr } = await supabase
      .from("support_requests")
      .select("id, subject, status, user_id, created_at, updated_at")
      .eq("id", id)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
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
    console.error("Admin support get error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/support/[id] - Risposta admin + opzionale chiudi
 * Body: { message: string, close?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""
    const adminId = session?.user?.id

    if (!isAdminEmail(email) || !adminId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { message, close } = body as { message?: string; close?: boolean }

    const supabase = createSupabaseAdminClient()

    const { data: req, error: reqErr } = await supabase
      .from("support_requests")
      .select("id, status, user_id")
      .eq("id", id)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (close) updatePayload.status = "closed"

    await supabase.from("support_requests").update(updatePayload).eq("id", id)

    if (message?.trim()) {
      await supabase.from("support_messages").insert({
        request_id: id,
        is_from_admin: true,
        author_id: adminId,
        message: message.trim(),
        attachment_urls: [],
      })

      // Notifica l'utente della risposta
      await supabase.from("notifications").insert({
        user_id: req.user_id,
        type: "support_reply",
        title: "Risposta assistenza",
        message: "Hai ricevuto una risposta alla tua richiesta di assistenza.",
        related_id: id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Admin support reply error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
