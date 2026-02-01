import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/support/requests - Crea nuova richiesta assistenza
 * Body: { subject, message, attachmentUrls?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { subject, message, attachmentUrls } = body as {
      subject?: string
      message?: string
      attachmentUrls?: string[]
    }

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Oggetto e messaggio obbligatori" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()

    const allowedRoles = ["host", "creator", "jolly"]
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: "Solo host, creator e jolly possono inviare richieste di assistenza" },
        { status: 403 }
      )
    }

    const { data: req, error: reqErr } = await supabase
      .from("support_requests")
      .insert({
        user_id: session.user.id,
        subject: subject.trim(),
        status: "open",
      })
      .select("id")
      .single()

    if (reqErr) throw reqErr
    if (!req?.id) throw new Error("Creazione richiesta fallita")

    const urls = Array.isArray(attachmentUrls) ? attachmentUrls : []
    const { error: msgErr } = await supabase.from("support_messages").insert({
      request_id: req.id,
      is_from_admin: false,
      author_id: session.user.id,
      message: message.trim(),
      attachment_urls: urls,
    })

    if (msgErr) throw msgErr

    return NextResponse.json({ success: true, id: req.id })
  } catch (e: unknown) {
    console.error("Support request create error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/support/requests - Elenco richieste dell'utente
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from("support_requests")
      .select("id, subject, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (e: unknown) {
    console.error("Support requests list error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
