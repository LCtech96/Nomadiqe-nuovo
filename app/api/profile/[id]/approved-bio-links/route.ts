import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET /api/profile/[id]/approved-bio-links - Restituisce i link approvati per la bio dell'utente */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 })

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("bio_link_approvals")
      .select("link_url")
      .eq("user_id", id)
      .eq("status", "approved")

    if (error) throw error

    const urls = (data || []).map((r) => r.link_url)
    return NextResponse.json({ urls })
  } catch (e) {
    console.error("Approved bio links error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
