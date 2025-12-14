import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Check if user exists in auth.users (we can't directly query this, but we can try to get user info)
    // Note: This is a workaround - in production you'd use Supabase Admin API
    
    // Try to get user by email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, created_at")
      .eq("email", email)
      .single()

    return NextResponse.json({
      email,
      profileExists: !!profile,
      profile: profile || null,
      profileError: profileError?.message || null,
      message: profile
        ? "Profile found in database"
        : "Profile not found - user may not exist or email not verified",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}




