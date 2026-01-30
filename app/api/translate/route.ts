import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Mappa delle lingue supportate
const LANGUAGE_MAP: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  ru: "russo",
  fr: "francese",
  de: "tedesco",
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json()

    // Testo vuoto: ritorna subito senza chiamare Groq (evita risposte "fornisci il testo")
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ translatedText: "" })
    }

    if (!targetLanguage || !LANGUAGE_MAP[targetLanguage]) {
      return NextResponse.json(
        { error: "Lingua di destinazione non valida" },
        { status: 400 }
      )
    }

    // Se la lingua è già quella di destinazione, non tradurre
    if (targetLanguage === "it") {
      return NextResponse.json({ translatedText: text })
    }

    const targetLanguageName = LANGUAGE_MAP[targetLanguage]

    // Usa Groq per tradurre il testo
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Sei un traduttore professionale. Traduci il testo fornito in ${targetLanguageName}, mantenendo il tono, lo stile e il significato originale. Se ci sono URL nel testo, non modificarli. Mantieni la formattazione originale (a capo, spazi, ecc.).`,
        },
        {
          role: "user",
          content: `Traduci questo testo in ${targetLanguageName}:\n\n${text}`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 2000,
    })

    let translatedText = completion.choices[0]?.message?.content?.trim() || text

    // Groq a volte risponde con messaggi di aiuto invece di tradurre (es. testo vuoto). Scartali.
    const metaPhrases = [
      "non c'è testo",
      "fornisci il testo",
      "provide the text",
      "provide the text you want",
      "no text provided",
      "sarò felice di aiutarti",
      "happy to help",
    ]
    if (metaPhrases.some((p) => translatedText.toLowerCase().includes(p))) {
      translatedText = text
    }

    return NextResponse.json({ translatedText })
  } catch (error: any) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: error?.message || "Errore durante la traduzione" },
      { status: 500 }
    )
  }
}
