import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET /api/admin/support/profiles?ids=["uuid1","uuid2"] - Ritorna profili per gli ID (admin) */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get("ids")
    let ids: string[] = []
    try {
      ids = JSON.parse(idsParam || "[]")
    } catch {
      return NextResponse.json({ profiles: {} })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ profiles: {} })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, role")
      .in("id", ids)

    if (error) throw error

    const profiles: Record<string, { full_name?: string; username?: string; email?: string; role?: string }> = {}
    ;(data || []).forEach((p: any) => {
      profiles[p.id] = {
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        role: p.role,
      }
    })

    return NextResponse.json({ profiles })
  } catch (e: unknown) {
    console.error("Admin support profiles error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
