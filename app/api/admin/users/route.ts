import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: list all users with roles */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, username, role, host_level, creator_level, structure_level, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading users:", error)
      return NextResponse.json(
        { error: "Errore nel caricamento utenti" },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  } catch (e: unknown) {
    console.error("Error in admin users GET:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}

/** PATCH: update user (e.g. structure_level for hosts) */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userId, structureLevel } = body as {
      userId?: string
      structureLevel?: number | string | null
    }

    if (!userId) {
      return NextResponse.json({ error: "userId richiesto" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const updateData: Record<string, unknown> = {}
    if (structureLevel !== undefined) {
      if (structureLevel === null || structureLevel === "" || structureLevel === "none") {
        updateData.structure_level = null
      } else {
        const level = Number(structureLevel)
        if (level < 1 || level > 4) {
          return NextResponse.json({ error: "structure_level deve essere 1, 2, 3 o 4" }, { status: 400 })
        }
        updateData.structure_level = level
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 })
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Error in admin users PATCH:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
