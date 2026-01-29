import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/cleaner/request-approval
 * Cleaner creates/updates cleaner_profiles and submits an approval request.
 * Admin must approve before the cleaner can accept jobs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      years_experience,
      insurance_status,
      agreement_url,
      driver_license,
      id_card_or_ssn,
    } = body as {
      years_experience?: number
      insurance_status?: string
      agreement_url?: string
      driver_license?: string
      id_card_or_ssn?: string
    }

    const supabase = createSupabaseAdminClient()

    const { data: existing } = await supabase
      .from("cleaner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    const profilePayload = {
      user_id: userId,
      years_experience: years_experience ?? null,
      insurance_status: insurance_status ?? null,
      agreement_url: agreement_url ?? null,
      driver_license: driver_license ?? null,
      id_card_or_ssn: id_card_or_ssn ?? null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateErr } = await supabase
        .from("cleaner_profiles")
        .update(profilePayload)
        .eq("user_id", userId)

      if (updateErr) {
        console.error("Error updating cleaner_profiles:", updateErr)
        return NextResponse.json(
          { error: "Errore nell'aggiornamento del profilo" },
          { status: 500 }
        )
      }
    } else {
      const { error: insertErr } = await supabase
        .from("cleaner_profiles")
        .insert({
          ...profilePayload,
          admin_approved_at: null,
          admin_approved_by: null,
          cleaner_id: null,
        })

      if (insertErr) {
        console.error("Error inserting cleaner_profiles:", insertErr)
        return NextResponse.json(
          { error: "Errore nella creazione del profilo" },
          { status: 500 }
        )
      }
    }

    const { data: pending } = await supabase
      .from("cleaner_approval_requests")
      .select("id")
      .eq("cleaner_user_id", userId)
      .eq("status", "pending")
      .maybeSingle()

    if (pending) {
      return NextResponse.json({
        success: true,
        message: "Hai già una richiesta in attesa di approvazione.",
      })
    }

    const { error: reqErr } = await supabase.from("cleaner_approval_requests").insert({
      cleaner_user_id: userId,
      status: "pending",
    })

    if (reqErr) {
      console.error("Error creating approval request:", reqErr)
      return NextResponse.json(
        { error: "Errore nell'invio della richiesta di approvazione" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Richiesta di approvazione inviata. L'admin la esaminerà a breve.",
    })
  } catch (e: any) {
    console.error("Error in cleaner request-approval:", e)
    return NextResponse.json(
      { error: e?.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
