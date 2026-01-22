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
    const { uploadType, videoUrl, fileSizeMb } = body

    if (!uploadType || !["post", "property", "presentation"].includes(uploadType)) {
      return NextResponse.json(
        { error: "Tipo di upload non valido" },
        { status: 400 }
      )
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "URL video mancante" },
        { status: 400 }
      )
    }

    if (!fileSizeMb || fileSizeMb > 100) {
      return NextResponse.json(
        { error: "Il video è troppo grande. Dimensione massima: 100MB" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Registra il caricamento video
    const { data: uploadId, error: recordError } = await supabase
      .rpc("record_video_upload", {
        p_user_id: session.user.id,
        p_upload_type: uploadType,
        p_video_url: videoUrl,
        p_file_size_mb: fileSizeMb,
      })

    if (recordError) {
      console.error("Error recording video upload:", recordError)
      
      // Gestisci errori specifici
      if (recordError.message?.includes("già caricato")) {
        return NextResponse.json(
          { error: "Hai già caricato un video di questo tipo oggi. Limite: 1 video al giorno per tipo." },
          { status: 400 }
        )
      }
      
      if (recordError.message?.includes("troppo grande")) {
        return NextResponse.json(
          { error: recordError.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: recordError.message || "Errore nella registrazione del caricamento" },
        { status: 500 }
      )
    }

    return NextResponse.json({ uploadId })
  } catch (error: any) {
    console.error("Error in record video upload API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
