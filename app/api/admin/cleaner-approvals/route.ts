import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: list pending cleaner approval requests */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: requests, error: reqError } = await supabase
      .from("cleaner_approval_requests")
      .select("id, cleaner_user_id, status, requested_at, created_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })

    if (reqError) {
      console.error("Error loading cleaner approval requests:", reqError)
      return NextResponse.json(
        { error: "Errore nel caricamento delle richieste" },
        { status: 500 }
      )
    }

    if (!requests?.length) {
      return NextResponse.json({ requests: [] })
    }

    const userIds = Array.from(new Set(requests.map((r) => r.cleaner_user_id)))
    const [profilesRes, cleanerProfilesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").in("id", userIds),
      supabase
        .from("cleaner_profiles")
        .select("user_id, years_experience, insurance_status, agreement_url")
        .in("user_id", userIds),
    ])

    const profileMap = Object.fromEntries(
      (profilesRes.data || []).map((p) => [p.id, p])
    )
    const cleanerMap = Object.fromEntries(
      (cleanerProfilesRes.data || []).map((c) => [c.user_id, c])
    )

    const enriched = (requests || []).map((r) => {
      const profile = profileMap[r.cleaner_user_id]
      const cleaner = cleanerMap[r.cleaner_user_id]
      return {
        id: r.id,
        cleaner_user_id: r.cleaner_user_id,
        status: r.status,
        requested_at: r.requested_at,
        created_at: r.created_at,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        years_experience: cleaner?.years_experience ?? null,
        insurance_status: cleaner?.insurance_status ?? null,
        agreement_url: cleaner?.agreement_url ?? null,
      }
    })

    return NextResponse.json({ requests: enriched })
  } catch (e: any) {
    console.error("Error in cleaner-approvals GET:", e)
    return NextResponse.json(
      { error: e?.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}

/** POST: approve or reject a cleaner approval request */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""
    const adminId = session?.user?.id as string | undefined

    if (!isAdminEmail(email) || !adminId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { requestId, action, rejectionReason } = body as {
      requestId?: string
      action?: "approve" | "reject"
      rejectionReason?: string
    }

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "requestId e action (approve|reject) richiesti" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: req, error: fetchErr } = await supabase
      .from("cleaner_approval_requests")
      .select("id, cleaner_user_id, status")
      .eq("id", requestId)
      .single()

    if (fetchErr || !req) {
      return NextResponse.json(
        { error: "Richiesta non trovata" },
        { status: 404 }
      )
    }

    if (req.status !== "pending") {
      return NextResponse.json(
        { error: "Richiesta già elaborata" },
        { status: 400 }
      )
    }

    const reviewedAt = new Date().toISOString()

    if (action === "reject") {
      const { error: updateErr } = await supabase
        .from("cleaner_approval_requests")
        .update({
          status: "rejected",
          reviewed_at: reviewedAt,
          reviewed_by: adminId,
          rejection_reason: rejectionReason || null,
          updated_at: reviewedAt,
        })
        .eq("id", requestId)

      if (updateErr) {
        console.error("Error rejecting cleaner request:", updateErr)
        return NextResponse.json(
          { error: "Errore durante il rifiuto" },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, action: "rejected" })
    }

    if (action === "approve") {
      const { data: cleanerIdResult, error: rpcErr } = await supabase.rpc(
        "generate_cleaner_id",
        { p_user_id: req.cleaner_user_id, p_department: "C" }
      )

      if (rpcErr) {
        console.error("Error generating cleaner_id:", rpcErr)
        return NextResponse.json(
          { error: "Errore nella generazione del Cleaner ID" },
          { status: 500 }
        )
      }

      const cleanerId = typeof cleanerIdResult === "string" ? cleanerIdResult : null
      if (!cleanerId) {
        return NextResponse.json(
          { error: "Impossibile generare Cleaner ID" },
          { status: 500 }
        )
      }

      const { error: profileErr } = await supabase
        .from("cleaner_profiles")
        .update({
          admin_approved_at: reviewedAt,
          admin_approved_by: adminId,
          cleaner_id: cleanerId,
          updated_at: reviewedAt,
        })
        .eq("user_id", req.cleaner_user_id)

      if (profileErr) {
        console.error("Error updating cleaner_profiles on approve:", profileErr)
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del profilo cleaner" },
          { status: 500 }
        )
      }

      const { error: reqUpdateErr } = await supabase
        .from("cleaner_approval_requests")
        .update({
          status: "approved",
          reviewed_at: reviewedAt,
          reviewed_by: adminId,
          updated_at: reviewedAt,
        })
        .eq("id", requestId)

      if (reqUpdateErr) {
        console.error("Error updating approval request:", reqUpdateErr)
        return NextResponse.json(
          { error: "Errore nell'aggiornamento della richiesta" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: "approved",
        cleaner_id: cleanerId,
      })
    }

    return NextResponse.json({ error: "Azione non valida" }, { status: 400 })
  } catch (e: any) {
    console.error("Error in cleaner-approvals POST:", e)
    return NextResponse.json(
      { error: e?.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
