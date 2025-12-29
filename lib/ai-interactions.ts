/**
 * Helper functions per inviare messaggi AI per interazioni (like, commenti)
 */

import { createSupabaseClient } from "./supabase/client"
import { sendActionMessage } from "./ai-messages"

const roleSpecificSuggestions: Record<string, Record<string, string[]>> = {
  traveler: {
    like: [
      "Scrivi un commento per condividere la tua opinione",
      "Esplora altri post e scopri nuove destinazioni",
      "Segui i creator e host che ti interessano",
    ],
    comment: [
      "Metti like ad altri post interessanti",
      "Pubblica il tuo primo post per condividere le tue esperienze",
      "Cerca strutture nella tua prossima destinazione",
    ],
  },
  host: {
    like: [
      "Carica altre strutture per aumentare la visibilità",
      "Cerca collaborazioni con creator digitali (KOL&BED)",
      "Gestisci le tue prenotazioni",
    ],
    comment: [
      "Pubblica nuove strutture",
      "Connettiti con altri host nella tua zona",
      "Rispondi alle recensioni dei tuoi ospiti",
    ],
  },
  creator: {
    like: [
      "Commenta per mostrare il tuo interesse",
      "Cerca nuove collaborazioni con host (KOL&BED)",
      "Pubblica contenuti sui tuoi viaggi",
    ],
    comment: [
      "Metti like ad altri post interessanti",
      "Cerca nuove opportunità di collaborazione",
      "Aggiorna le tue analitiche nel profilo",
    ],
  },
  manager: {
    like: [
      "Carica nuovi prodotti e servizi nel tuo catalogo",
      "Invia listini prezzi agli host interessati",
      "Crea proposte di partnership",
    ],
    comment: [
      "Aggiungi nuovi servizi al catalogo",
      "Connettiti con host per offrire i tuoi servizi",
      "Aggiorna i listini prezzi",
    ],
  },
}

export async function sendLikeMessage(userId: string) {
  try {
    const supabase = createSupabaseClient()
    
    // Recupera il ruolo dell'utente
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (!profile?.role) {
      console.warn("Nessun ruolo trovato per l'utente, skip messaggio AI")
      return false
    }

    const role = profile.role as "traveler" | "host" | "creator" | "manager"
    const suggestions = roleSpecificSuggestions[role]?.like || [
      "Continua a esplorare la piattaforma",
      "Interagisci con altri contenuti",
    ]

    // Assegna punti per il like (accumulabile e irreversibile)
    let pointsEarned: number | undefined = undefined
    try {
      const { awardPoints } = await import("./points")
      const awarded = await awardPoints(userId, "like", "Like messo a un post")
      if (awarded) {
        // Recupera il valore dei punti assegnati
        const { POINTS_CONFIG } = await import("./points")
        pointsEarned = POINTS_CONFIG.like
      }
    } catch (pointsError) {
      // Non bloccare se l'assegnazione punti fallisce
      console.warn("Errore nell'assegnazione punti per like (non critico):", pointsError)
    }

    // Invia messaggio AI con informazioni sui punti guadagnati
    await sendActionMessage(
      userId,
      "like",
      "Like messo a un post",
      role,
      pointsEarned,
      suggestions
    )

    return true
  } catch (error) {
    console.error("Errore nell'invio del messaggio AI per like:", error)
    return false
  }
}

export async function sendCommentMessage(userId: string) {
  try {
    const supabase = createSupabaseClient()
    
    // Recupera il ruolo dell'utente
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (!profile?.role) {
      console.warn("Nessun ruolo trovato per l'utente, skip messaggio AI")
      return false
    }

    const role = profile.role as "traveler" | "host" | "creator" | "manager"
    const suggestions = roleSpecificSuggestions[role]?.comment || [
      "Continua a interagire con altri contenuti",
      "Esplora nuove funzionalità",
    ]

    // I commenti danno 10 XP (dal trigger SQL), ma non punti nel sistema points
    await sendActionMessage(
      userId,
      "comment",
      "Commento pubblicato",
      role,
      undefined, // Non ci sono punti nel sistema points, solo XP
      suggestions
    )

    return true
  } catch (error) {
    console.error("Errore nell'invio del messaggio AI per commento:", error)
    return false
  }
}

