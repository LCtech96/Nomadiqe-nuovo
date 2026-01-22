import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { uploadType } = body

    if (!uploadType || !["post", "property", "presentation"].includes(uploadType)) {
      return NextResponse.json(
        { error: "Tipo di upload non valido" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Verifica se può caricare un video oggi
    const { data: canUpload, error: checkError } = await supabase
      .rpc("can_upload_video_today", {
        p_user_id: session.user.id,
        p_upload_type: uploadType,
      })

    if (checkError) {
      console.error("Error checking video upload limit:", checkError)
      return NextResponse.json(
        { error: "Errore nel controllo del limite" },
        { status: 500 }
      )
    }

    return NextResponse.json({ canUpload: canUpload === true })
  } catch (error: any) {
    console.error("Error in check video limit API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
