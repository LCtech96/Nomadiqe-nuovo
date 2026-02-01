import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET /api/admin/posts - Elenco post in attesa di approvazione */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from("posts")
      .select("id, content, images, video_url, approval_status, created_at, author_id")
      .eq("approval_status", status)
      .order("created_at", { ascending: false })

    if (error) throw error

    if (!data?.length) {
      return NextResponse.json({ posts: [] })
    }

    const authorIds = [...new Set(data.map((p: any) => p.author_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, role")
      .in("id", authorIds)

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const postsWithAuthors = data.map((p: any) => ({
      ...p,
      author: profilesMap.get(p.author_id) || null,
    }))

    return NextResponse.json({ posts: postsWithAuthors })
  } catch (e: unknown) {
    console.error("Admin posts list error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
