import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export type UserRole = "traveler" | "host" | "creator" | "manager"

export interface WelcomeMessageParams {
  userId: string
  role: UserRole
  username?: string
  fullName?: string
}

export interface ActionMessageParams {
  userId: string
  action: string
  actionDescription: string
  role: UserRole
  pointsEarned?: number
  nextSteps?: string[]
}

export interface InactivityMessageParams {
  userId: string
  role: UserRole
  username?: string
  fullName?: string
  hoursInactive?: number
}

const ROLE_GUIDES: Record<UserRole, string> = {
  traveler: `Sei un Traveler su Nomadiqe. Ecco cosa puoi fare:
- Cerca e prenota strutture uniche
- Scrivi recensioni e guadagna punti
- Segui i tuoi host e creator preferiti
- Condividi le tue esperienze di viaggio
- Partecipa alle community di viaggio`,
  
  host: `Sei un Host su Nomadiqe. Ecco cosa puoi fare:
- Pubblica e gestisci le tue strutture
- Collabora con creator per promozioni (KOL&BED)
- Gestisci prenotazioni e calendario
- Connettiti con altri host nella tua zona tramite community
- Ricevi recensioni e costruisci la tua reputazione`,
  
  creator: `Sei un Creator su Nomadiqe. Ecco cosa puoi fare:
- Collabora con host per FREE STAY (KOL&BED)
- Pubblica contenuti sui tuoi viaggi
- Costruisci il tuo profilo e aumenta il tuo pubblico
- Gestisci le tue analitiche e visibilità
- Connettiti con brand e strutture`,
  
  manager: `Sei un Manager su Nomadiqe. Ecco cosa puoi fare:
- Gestisci servizi per strutture (pulizia, manutenzione, etc.)
- Crea cataloghi prodotti e servizi
- Connettiti con host per partnership
- Monitora le tue collaborazioni`,
}

const POINTS_INFO = `Guadagni punti completando azioni:
- Registrazione: 100 punti
- Onboarding completato: 75 punti
- Creazione post: 15 punti (max 5 al giorno)
- Check-in giornaliero: 10 punti (1 al giorno)
- Prenotazione: 50 punti
- Recensione: 25 punti
- Like: 2 punti per ogni like`

export async function generateWelcomeMessage(params: WelcomeMessageParams): Promise<string> {
  const { role, username, fullName } = params
  
  const userName = fullName || username || "viaggiatore"
  const roleGuide = ROLE_GUIDES[role]
  
  const prompt = `Sei l'assistente AI di Nomadiqe, una piattaforma per viaggiatori, host, creator e manager del turismo.

L'utente ${userName} si è appena registrato come ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Manager"} su Nomadiqe.

Scrivi un messaggio di benvenuto BREVE (massimo 150 parole) che:
1. Dà il benvenuto calorosamente
2. Spiega brevemente il loro ruolo: ${roleGuide}
3. Spiega come guadagnare punti: ${POINTS_INFO}
4. Fornisce 2-3 suggerimenti pratici per iniziare subito

Sii amichevole, entusiasta ma conciso. Usa emoji con moderazione (max 2-3). Scrivi in italiano.

Messaggio:`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI amichevole e professionale per Nomadiqe. Scrivi messaggi brevi, chiari e incoraggianti in italiano.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 300,
    })

    const message = completion.choices[0]?.message?.content?.trim()
    if (!message) {
      throw new Error("Nessuna risposta dal modello AI")
    }

    return message
  } catch (error) {
    console.error("Errore nella generazione del messaggio di benvenuto:", error)
    // Fallback message
    return `Ciao ${userName}! 👋 Benvenuto su Nomadiqe come ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Manager"}!

${roleGuide}

${POINTS_INFO}

Per iniziare, completa il tuo profilo e esplora la piattaforma. Buon viaggio! 🌍`
  }
}

export async function generateActionMessage(params: ActionMessageParams): Promise<string> {
  const { action, actionDescription, role, pointsEarned, nextSteps } = params
  
  const actionEmojis: Record<string, string> = {
    post: "📝",
    booking: "🏨",
    review: "⭐",
    check_in: "✅",
    onboarding: "🎯",
    profile_complete: "✨",
    collaboration: "🤝",
    like: "❤️",
    comment: "💬",
  }
  
  const emoji = actionEmojis[action] || "🎉"
  
  const nextStepsText = nextSteps && nextSteps.length > 0 
    ? `\n\nProssimi passi:\n${nextSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
    : ""
  
  const pointsText = pointsEarned ? ` Hai guadagnato ${pointsEarned} punti!` : ""
  
  const prompt = `Sei l'assistente AI di Nomadiqe.

L'utente ha appena completato questa azione: ${actionDescription}${pointsText}

Ruolo dell'utente: ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Manager"}

Scrivi un messaggio BREVE (massimo 100 parole) che:
1. Complimenta l'utente per l'azione completata
2. Spiega brevemente perché è importante${pointsEarned ? " e quanti punti ha guadagnato" : ""}
3. Suggerisce cosa fare dopo${nextStepsText ? " (usa i prossimi passi forniti)" : ""}

Sii positivo e incoraggiante. Usa max 2 emoji. Scrivi in italiano.

Messaggio:`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI amichevole per Nomadiqe. Scrivi messaggi brevi e incoraggianti in italiano.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 200,
    })

    const message = completion.choices[0]?.message?.content?.trim()
    if (!message) {
      throw new Error("Nessuna risposta dal modello AI")
    }

    return `${emoji} ${message}`
  } catch (error) {
    console.error("Errore nella generazione del messaggio di azione:", error)
    // Fallback message
    return `${emoji} Ottimo lavoro! Hai completato: ${actionDescription}${pointsText}${nextStepsText}`
  }
}

const roleSpecificSuggestions: Record<UserRole, Record<string, string[]>> = {
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
    inactivity: [
      "Esplora nuovi post e destinazioni",
      "Cerca la tua prossima avventura",
      "Scrivi una recensione per le strutture che hai visitato",
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
    inactivity: [
      "Carica nuove strutture per attrarre più viaggiatori",
      "Cerca collaborazioni con creator per promuovere le tue proprietà",
      "Gestisci il calendario delle prenotazioni",
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
    inactivity: [
      "Pubblica nuovi contenuti sui tuoi viaggi",
      "Cerca collaborazioni con host per FREE STAY",
      "Aggiorna le tue analitiche e visibilità",
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
    inactivity: [
      "Carica nuovi prodotti e servizi",
      "Invia listini prezzi agli host interessati",
      "Crea nuove proposte di partnership",
    ],
  },
}

export async function generateInactivityMessage(params: InactivityMessageParams): Promise<string> {
  const { role, username, fullName, hoursInactive = 1 } = params
  
  const userName = fullName || username || "utente"
  const suggestions = roleSpecificSuggestions[role]?.inactivity || [
    "Esplora la piattaforma",
    "Interagisci con altri utenti",
    "Scopri nuove funzionalità",
  ]
  
  const prompt = `Sei l'assistente AI di Nomadiqe.

L'utente ${userName} non ha interagito con l'app per circa ${hoursInactive} ${hoursInactive === 1 ? "ora" : "ore"}.

Ruolo dell'utente: ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Manager"}

Scrivi un messaggio BREVE e amichevole (massimo 120 parole) che:
1. Ricorda all'utente che sei qui per aiutarlo
2. Lo incoraggia a tornare attivo
3. Suggerisce 2-3 azioni specifiche per il suo ruolo: ${suggestions.join(", ")}
4. Gli ricorda come guadagnare punti

Sii positivo, non invadente. Usa max 2 emoji. Scrivi in italiano.

Messaggio:`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un assistente AI amichevole per Nomadiqe. Scrivi messaggi brevi, incoraggianti e non invadenti in italiano.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 250,
    })

    const message = completion.choices[0]?.message?.content?.trim()
    if (!message) {
      throw new Error("Nessuna risposta dal modello AI")
    }

    return `👋 ${message}`
  } catch (error) {
    console.error("Errore nella generazione del messaggio di inattività:", error)
    // Fallback message
    return `👋 Ciao ${userName}! Non ti vedo da un po'. ${suggestions[0] || "Esplora la piattaforma"} per tornare attivo!`
  }
}

