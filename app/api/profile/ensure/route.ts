import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/profile/ensure
 * Assicura che il profilo dell'utente autenticato esista in profiles.
 * Crea il profilo se manca (fix per utenti NextAuth senza riga in profiles).
 * Usato prima di push_subscriptions, follows, ecc.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, created: false })
    }

    const email = session.user.email || `${session.user.id}@placeholder.local`
    const baseName = session.user.name || email.split("@")[0] || "User"
    const safeId = session.user.id.replace(/-/g, "").slice(0, 12)

    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      email,
      full_name: baseName,
      username: `user_${safeId}`,
    })

    if (error) {
      console.error("Profile ensure insert error:", error)
      return NextResponse.json(
        { error: error.message || "Impossibile creare il profilo" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, created: true })
  } catch (e: unknown) {
    console.error("Profile ensure error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
