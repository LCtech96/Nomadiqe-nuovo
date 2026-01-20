import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ approved: false }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("waitlist_requests")
      .select("status")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error("Error verifying waitlist:", error)
      return NextResponse.json({ approved: false }, { status: 500 })
    }

    return NextResponse.json({ approved: data?.status === "approved" })
  } catch (error: any) {
    console.error("Error in waitlist verify API:", error)
    return NextResponse.json(
      { approved: false, error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
