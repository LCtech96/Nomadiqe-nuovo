import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET /api/admin/bio-links - Elenco link bio in attesa di approvazione */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdminEmail(session?.user?.email || "")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from("bio_link_approvals")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) throw error

    if (!data?.length) {
      return NextResponse.json({ items: [] })
    }

    const userIds = Array.from(new Set(data.map((r: any) => r.user_id)))
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, role")
      .in("id", userIds)

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const items = data.map((r: any) => ({
      ...r,
      profile: profilesMap.get(r.user_id) || null,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    console.error("Admin bio-links list error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
