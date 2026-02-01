import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** POST /api/admin/posts/[id]/approve - Approva o rifiuta un post */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { action } = body as { action?: "approve" | "reject" }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action richiesto: approve o reject" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("id, author_id, approval_status")
      .eq("id", id)
      .single()

    if (fetchErr || !post) {
      return NextResponse.json({ error: "Post non trovato" }, { status: 404 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    const { error: updateErr } = await supabase
      .from("posts")
      .update({
        approval_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateErr) throw updateErr

    // Notifica l'autore
    await supabase.from("notifications").insert({
      user_id: post.author_id,
      type: action === "approve" ? "post_approved" : "post_rejected",
      title: action === "approve" ? "Post approvato" : "Post non approvato",
      message:
        action === "approve"
          ? "Il tuo post è stato approvato ed è ora visibile nel feed."
          : "Il tuo post non è stato approvato dall'admin.",
      related_id: id,
    })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (e: unknown) {
    console.error("Admin post approve error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
