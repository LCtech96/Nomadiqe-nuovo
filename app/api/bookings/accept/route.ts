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
    const { messageId, iban } = body

    if (!messageId) {
      return NextResponse.json({ error: "messageId richiesto" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Carica il messaggio con i dati della richiesta
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

    // Crea la prenotazione
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        property_id: bookingData.property_id,
        traveler_id: message.sender_id,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        guests: bookingData.guests,
        total_price: bookingData.total_price,
        status: "confirmed",
        booking_request_message_id: messageId,
      })
      .select()
      .single()

    if (bookingError) {
      console.error("Error creating booking:", bookingError)
      return NextResponse.json({ error: "Impossibile creare la prenotazione" }, { status: 500 })
    }

    // Aggiorna lo status del messaggio
    await supabase
      .from("messages")
      .update({ booking_request_status: "accepted" })
      .eq("id", messageId)

    // Invia messaggio di conferma al viaggiatore con IBAN se fornito
    const confirmationMessage = iban
      ? `La tua richiesta di prenotazione per "${bookingData.property_name}" è stata accettata! 🎉

Dettagli prenotazione:
- Check-in: ${new Date(bookingData.check_in).toLocaleDateString("it-IT")}
- Check-out: ${new Date(bookingData.check_out).toLocaleDateString("it-IT")}
- Notti: ${bookingData.nights}
- Ospiti: ${bookingData.guests}
- Totale: €${bookingData.total_price.toFixed(2)}

Per completare il pagamento, effettua un bonifico al seguente IBAN:
${iban}

Invia una ricevuta del pagamento dopo aver effettuato il bonifico.`
      : `La tua richiesta di prenotazione per "${bookingData.property_name}" è stata accettata! 🎉

Dettagli prenotazione:
- Check-in: ${new Date(bookingData.check_in).toLocaleDateString("it-IT")}
- Check-out: ${new Date(bookingData.check_out).toLocaleDateString("it-IT")}
- Notti: ${bookingData.nights}
- Ospiti: ${bookingData.guests}
- Totale: €${bookingData.total_price.toFixed(2)}

L'host ti invierà i dettagli per il pagamento a breve.`

    await supabase
      .from("messages")
      .insert({
        sender_id: session.user.id,
        receiver_id: message.sender_id!,
        content: confirmationMessage,
        read: false,
      })

    // Se IBAN è stato fornito, invialo anche in un messaggio separato
    if (iban) {
      await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: message.sender_id!,
          content: `Dettagli IBAN per il pagamento:\n\n${iban}\n\nEffettua il bonifico entro 48 ore per confermare la prenotazione.`,
          read: false,
        })
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error("Error accepting booking:", error)
    return NextResponse.json({ error: error.message || "Errore del server" }, { status: 500 })
  }
}

