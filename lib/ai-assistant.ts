import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export type UserRole = "traveler" | "host" | "creator" | "jolly"

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
  username?: string
  fullName?: string
}

export interface InactivityMessageParams {
  userId: string
  role: UserRole
  username?: string
  fullName?: string
  hoursInactive?: number
}

export interface ChatMessageParams {
  userId: string
  userMessage: string
  role: UserRole
  username?: string
  fullName?: string
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
  
  jolly: `Sei un Jolly su Nomadiqe. Ecco cosa puoi fare:
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

// Conoscenza completa delle funzionalità dell'app per ogni ruolo
const APP_KNOWLEDGE: Record<UserRole, string> = {
  traveler: `
FUNZIONALITÀ DISPONIBILI PER TRAVELER:
1. HOME: Visualizza feed con post di host e creator, metti like e commenta
2. ESPLORA: Cerca strutture per destinazione, date, numero ospiti
3. PROPRIETÀ: Visualizza dettagli strutture, foto, servizi, recensioni, disponibilità calendario
4. PRENOTAZIONI: Richiedi prenotazione tramite messaggi all'host, gestisci le tue prenotazioni
5. MESSAGGI: Comunica con host, creator, jolly e assistente AI
6. PROFILO: Gestisci profilo, visualizza post pubblicati, strutture salvate
7. POST: Crea post con testo, immagini, tag posizione, condividi esperienze
8. RECENSIONI: Lascia recensioni per strutture visitate (dopo prenotazione completata)
9. COLLABORAZIONI: Visualizza collaborazioni con host (se creator anche)
10. PUNTI: Accumula punti con azioni, visualizza storia punti e livello
11. NOTIFICHE: Ricevi notifiche per messaggi, like, commenti, prenotazioni
12. NAVIGAZIONE: Home, Esplora, Feed, Collabora, Profilo
13. LIVELLI: Sistema di livellamento basato su punti per privilegi esclusivi

COME GUADAGNARE PUNTI:
- Registrazione: 100 punti
- Onboarding: 75 punti  
- Post: 15 punti (max 5/giorno)
- Check-in giornaliero: 10 punti (1/giorno)
- Prenotazione: 50 punti
- Recensione: 25 punti
- Like: 2 punti per like

ASSISTENZA: Per domande specifiche o problemi tecnici, contatta l'assistenza traveler su Nomadiqe.`,

  host: `
FUNZIONALITÀ DISPONIBILI PER HOST:
1. DASHBOARD: Pannello principale per gestire strutture, prenotazioni, collaborazioni
2. PROPRIETÀ: Aggiungi/modifica strutture con foto, descrizioni, servizi, prezzi, disponibilità
3. CALENDARIO: Gestisci disponibilità strutture, blocca date, visualizza prenotazioni
4. PRENOTAZIONI: Ricevi richieste prenotazione via messaggi, accetta/rifiuta, gestisci conferme
5. COLLABORAZIONI KOL&BED: Crea collaborazioni con creator per FREE STAY, sconti, partnership
6. COMMUNITY HOST: Crea/partecipa community con altri host nella tua zona, scambia messaggi
7. MESSAGGI: Comunica con viaggiatori, creator, manager e assistente AI
8. PROFILO: Gestisci profilo host, visualizza strutture pubblicate, statistiche
9. POST: Crea post per promuovere strutture, condividere esperienze
10. RECENSIONI: Visualizza e rispondi a recensioni degli ospiti
11. GESTIONE STRUTTURE: Aggiungi/modifica/elimina strutture, gestisci foto, servizi
12. LISTINO PREZZI: Imposta prezzi per notte, gestisci tariffe stagionali
13. PUNTI: Accumula punti con azioni, visualizza storia punti e livello
14. NOTIFICHE: Ricevi notifiche per prenotazioni, messaggi, recensioni, collaborazioni
15. NAVIGAZIONE: Home, Dashboard, Esplora, Feed, Collabora, Profilo
16. LIVELLI HOST: Sistema di livellamento basato su utenti invitati (Base, Advanced, Rubino, Zaffiro, Prime)

COME GUADAGNARE PUNTI:
- Registrazione: 100 punti
- Onboarding: 75 punti
- Post: 15 punti (max 5/giorno)
- Check-in: 10 punti (1/giorno)
- Prenotazione completata: 50 punti
- Recensione ricevuta: 25 punti

ASSISTENZA: Per domande specifiche su gestione strutture, prenotazioni o problemi tecnici, contatta l'assistenza host su Nomadiqe.`,

  creator: `
FUNZIONALITÀ DISPONIBILI PER CREATOR:
1. PROFILO: Gestisci profilo creator, aggiungi foto/video, descrizioni, analitiche manuali
2. KOL&BED: Cerca collaborazioni con host per FREE STAY, richiedi collaborazioni
3. POST: Crea post con contenuti di viaggio, foto, video, tag posizione
4. ANALITICHE: Inserisci manualmente follower, engagement, views per mostrare statistiche
5. VISIBILITÀ: Nascondi/mostra contenuti (post, foto, video) a specifiche audience (jollies, hosts, travelers, creators)
6. COLLABORAZIONI: Gestisci richieste collaborazioni, accetta/rifiuta proposte host
7. MESSAGGI: Comunica con host, jolly, altri creator e assistente AI
8. FEED: Visualizza post di altri creator e host, interagisci con like/commenti
9. SEGUI UTENTI: Segui host e creator interessanti
10. PROFILO PUBBLICO: Mostra analitiche, collaborazioni, contenuti (con privacy settings)
11. GESTIONE CONTENUTI: Pubblica/modifica/elimina post, gestisci visibilità
12. PUNTI: Accumula punti con azioni, visualizza storia punti e livello
13. NOTIFICHE: Ricevi notifiche per collaborazioni, messaggi, like, commenti
14. NAVIGAZIONE: Home, Feed, Collabora, Profilo
15. LIVELLI: Sistema di livellamento basato su punti per privilegi esclusivi

COME GUADAGNARE PUNTI:
- Registrazione: 100 punti
- Onboarding: 75 punti
- Post: 15 punti (max 5/giorno)
- Check-in: 10 punti (1/giorno)
- Like: 2 punti per like
- Commento: 10 XP (sistema separato)

ASSISTENZA: Per domande specifiche su collaborazioni, analitiche o problemi tecnici, contatta l'assistenza creator su Nomadiqe.`,

  jolly: `
FUNZIONALITÀ DISPONIBILI PER JOLLY:
1. DASHBOARD: Pannello principale per gestire servizi e prodotti
2. SERVIZI: Crea/gestisci servizi (pulizia, manutenzione, fotografia, videografia, social media, concierge, cucina, autista, traduzione, farmacista)
3. PRODOTTI: Crea catalogo prodotti con prezzi, descrizioni, immagini
4. PUBBLICA FEED: Pubblica prodotti sul feed principale per visibilità
5. LOCATION: Specifica indirizzo, città, paese, coordinate GPS per servizi locali
6. ORARI: Imposta orari operativi giornalieri per servizi locali
7. LISTINI PREZZI: Crea listini prezzi per host, gestisci commissioni
8. PARTNERSHIP: Connettiti con host per offrire servizi/prodotti
9. MESSAGGI: Comunica con host, creator, altri jolly e assistente AI
10. PROFILO: Gestisci profilo jolly, mostra servizi e prodotti
11. CATALOGO: Organizza prodotti in categorie, gestisci disponibilità
12. COLLABORAZIONI: Visualizza e gestisci partnership attive con host
13. PUNTI: Accumula punti con azioni, visualizza storia punti e livello
14. NOTIFICHE: Ricevi notifiche per messaggi, richieste partnership
15. NAVIGAZIONE: Home, Dashboard, Feed, Collabora, Profilo
16. LIVELLI: Sistema di livellamento basato su punti per privilegi esclusivi

TIPI SERVIZI DISPONIBILI:
- Pulizia (cleaning)
- Gestione proprietà (property_management)
- Fotografia (photography)
- Videografia (videography)
- Social media (social_media)
- Manutenzione (maintenance)
- Concierge (concierge)
- Cucina (cooking)
- Autista (driver)
- Traduzione (translation)
- Farmacista (pharmacist)

COME GUADAGNARE PUNTI:
- Registrazione: 100 punti
- Onboarding: 75 punti
- Post: 15 punti (max 5/giorno)
- Check-in: 10 punti (1/giorno)
- Like: 2 punti per like

ASSISTENZA: Per domande specifiche su servizi, prodotti, partnership o problemi tecnici, contatta l'assistenza jolly su Nomadiqe.`,
}

export async function generateWelcomeMessage(params: WelcomeMessageParams): Promise<string> {
  const { role, username, fullName } = params
  
  const userName = fullName || username || "viaggiatore"
  const roleGuide = ROLE_GUIDES[role]
  
  const prompt = `Sei l'assistente AI di Nomadiqe, una piattaforma per viaggiatori, host, creator e jolly del turismo.

L'utente ${userName} si è appena registrato come ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Jolly"} su Nomadiqe.

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
    return `Ciao ${userName}! 👋 Benvenuto su Nomadiqe come ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Jolly"}!

${roleGuide}

${POINTS_INFO}

Per iniziare, completa il tuo profilo e esplora la piattaforma. Buon viaggio! 🌍`
  }
}

export async function generateActionMessage(params: ActionMessageParams): Promise<string> {
  const { action, actionDescription, role, pointsEarned, nextSteps, username, fullName } = params
  
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
  
  // Usa il nome completo o username, fallback a "utente"
  const userName = fullName || username || "utente"
  
  const prompt = `Sei l'assistente AI di Nomadiqe.

L'utente ${userName} ha appena completato questa azione: ${actionDescription}${pointsText}

Ruolo dell'utente: ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Jolly"}

Scrivi un messaggio BREVE (massimo 100 parole) in italiano con un linguaggio naturale e diretto che:
1. Complimenta ${userName} per l'azione completata (usa il suo nome)
2. Spiega brevemente perché è importante${pointsEarned ? " e quanti punti ha guadagnato" : ""}
3. Suggerisce cosa fare dopo${nextStepsText ? " (usa i prossimi passi forniti)" : ""}

IMPORTANTE:
- Scrivi il messaggio DIRETTAMENTE senza virgolette, come se stessi parlando direttamente all'utente
- Usa il nome ${userName} nell'inizio del messaggio
- Sii positivo e incoraggiante
- Usa max 2 emoji
- Scrivi in italiano con linguaggio naturale

Messaggio (senza virgolette, inizia direttamente con il testo):`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei l'assistente AI di Nomadiqe. Scrivi messaggi brevi, incoraggianti e naturali in italiano. Scrivi sempre il messaggio direttamente senza virgolette, come se stessi parlando faccia a faccia con l'utente.",
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

    let message = completion.choices[0]?.message?.content?.trim() || ""
    
    // Rimuovi virgolette all'inizio e alla fine se presenti
    message = message.replace(/^["'«»]|["'«»]$/g, "").trim()
    
    if (!message || message.length === 0) {
      // Fallback message se l'AI non genera un messaggio valido
      return `${emoji} Complimenti ${userName}! Hai completato: ${actionDescription}${pointsText}${nextStepsText}`
    }

    return `${emoji} ${message}`
  } catch (error) {
    console.error("Errore nella generazione del messaggio di azione:", error)
    // Fallback message
    return `${emoji} Complimenti ${userName}! Hai completato: ${actionDescription}${pointsText}${nextStepsText}`
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
  jolly: {
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

Ruolo dell'utente: ${role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Jolly"}

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

export async function generateChatResponse(params: ChatMessageParams): Promise<string> {
  const { userId, userMessage, role, username, fullName } = params
  
  const userName = fullName || username || "utente"
  const roleName = role === "traveler" ? "Traveler" : role === "host" ? "Host" : role === "creator" ? "Creator" : "Manager"
  const appKnowledge = APP_KNOWLEDGE[role]
  const roleGuide = ROLE_GUIDES[role]
  
  // Determina il tipo di assistenza da suggerire
  const supportContact = role === "traveler" 
    ? "assistenza traveler" 
    : role === "host" 
    ? "assistenza host" 
    : role === "creator"
    ? "assistenza creator"
    : "assistenza jolly"
  
  const prompt = `Sei l'assistente AI di Nomadiqe, una piattaforma per viaggiatori, host, creator e jolly del turismo.

L'utente ${userName} (ruolo: ${roleName}) ti ha scritto questo messaggio:
"${userMessage}"

CONOSCENZA COMPLETA DELL'APP PER ${roleName.toUpperCase()}:
${appKnowledge}

GUIDA RUOLO:
${roleGuide}

SISTEMA PUNTI:
${POINTS_INFO}

ISTRUZIONI IMPORTANTI:
1. Rispondi in modo utile, amichevole e professionale in italiano
2. Usa il nome ${userName} quando ti rivolgi all'utente
3. Se la domanda riguarda funzionalità che conosci (descritte sopra), fornisci una risposta dettagliata
4. Se NON sei sicuro di qualcosa o la domanda è troppo specifica/tecnica/complessa, devi dire:
   "Per questa domanda specifica o per assistenza tecnica, ti consiglio di contattare ${supportContact} su Nomadiqe, che potrà aiutarti meglio."
5. Se la domanda riguarda guadagnare punti, spiega il sistema punti e suggerisci azioni
6. Se la domanda riguarda funzionalità dell'app, spiega come usarle basandoti sulla conoscenza sopra
7. Sii conciso ma completo (massimo 200 parole)
8. Usa emoji con moderazione (max 2-3)
9. Scrivi in italiano con linguaggio naturale, senza virgolette

Risposta (senza virgolette, inizia direttamente con il testo):`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Sei l'assistente AI di Nomadiqe. Rispondi sempre in italiano con linguaggio naturale e diretto. Se non sei sicuro di qualcosa, di' all'utente di contattare l'assistenza specifica per il loro ruolo. Non usare virgolette nel testo.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 400,
    })

    let message = completion.choices[0]?.message?.content?.trim() || ""
    
    // Rimuovi virgolette all'inizio e alla fine se presenti
    message = message.replace(/^["'«»]|["'«»]$/g, "").trim()
    
    if (!message || message.length === 0) {
      return `Ciao ${userName}! Mi dispiace, non sono sicuro di come rispondere alla tua domanda. Per assistenza specifica, ti consiglio di contattare ${supportContact} su Nomadiqe.`
    }

    return message
  } catch (error) {
    console.error("Errore nella generazione della risposta chat:", error)
    return `Ciao ${userName}! Mi dispiace, c'è stato un problema nel generare la risposta. Per assistenza specifica, ti consiglio di contattare ${supportContact} su Nomadiqe.`
  }
}

