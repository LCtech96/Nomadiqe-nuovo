import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET /api/support/role-check - Ritorna il ruolo utente (per mostrare bottone assistenza) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ role: null })
    }

    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()

    return NextResponse.json({ role: data?.role || null })
  } catch {
    return NextResponse.json({ role: null })
  }
}
