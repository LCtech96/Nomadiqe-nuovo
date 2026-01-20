import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("waitlist_requests")
      .select("id, full_name, email, username, phone_number, role, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading waitlist:", error)
      return NextResponse.json(
        { error: "Errore nel caricamento della waitlist" },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests: data || [] })
  } catch (error: any) {
    console.error("Error in waitlist pending API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
