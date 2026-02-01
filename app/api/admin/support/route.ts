import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/support - Elenco tutte le richieste (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // open | closed | null = all

    const supabase = createSupabaseAdminClient()

    let q = supabase
      .from("support_requests")
      .select("id, subject, status, user_id, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (status && ["open", "closed"].includes(status)) {
      q = q.eq("status", status)
    }

    const { data, error } = await q

    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (e: unknown) {
    console.error("Admin support list error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
