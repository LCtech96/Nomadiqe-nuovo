import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({ error: "messageId richiesto" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Carica il messaggio
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 })
    }

    // Verifica che il messaggio sia una richiesta di prenotazione
    if (!message.booking_request_data || message.booking_request_status !== "pending") {
      return NextResponse.json({ error: "Questo messaggio non è una richiesta di prenotazione valida" }, { status: 400 })
    }

    // Verifica che l'utente sia il destinatario (host)
    if (message.receiver_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const bookingData = message.booking_request_data

    // Aggiorna lo status del messaggio
    await supabase
      .from("messages")
      .update({ booking_request_status: "rejected" })
      .eq("id", messageId)

    // Invia messaggio di rifiuto al viaggiatore
    const rejectionMessage = `Spiacente, la tua richiesta di prenotazione per "${bookingData.property_name}" non può essere accettata al momento.

Dettagli della richiesta:
- Check-in: ${new Date(bookingData.check_in).toLocaleDateString("it-IT")}
- Check-out: ${new Date(bookingData.check_out).toLocaleDateString("it-IT")}
- Notti: ${bookingData.nights}
- Ospiti: ${bookingData.guests}

Ti invitiamo a cercare altre disponibilità o contattarci per ulteriori informazioni.`

    await supabase
      .from("messages")
      .insert({
        sender_id: session.user.id,
        receiver_id: message.sender_id!,
        content: rejectionMessage,
        read: false,
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error rejecting booking:", error)
    return NextResponse.json({ error: error.message || "Errore del server" }, { status: 500 })
  }
}

