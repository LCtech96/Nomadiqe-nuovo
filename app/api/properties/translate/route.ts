import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { locales } from "@/lib/i18n/translations"

const LANGUAGE_MAP: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  ru: "russo",
  fr: "francese",
  de: "tedesco",
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || targetLanguage === "it") {
    return text
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    })

    if (!response.ok) {
      console.warn(`Translation failed for ${targetLanguage}, using original text`)
      return text
    }

    const { translatedText } = await response.json()
    return translatedText || text
  } catch (error) {
    console.error(`Translation error for ${targetLanguage}:`, error)
    return text
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { propertyId, name, description } = await request.json()

    if (!propertyId || !name) {
      return NextResponse.json({ error: "Property ID e nome sono obbligatori" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Verifica che l'utente sia il proprietario
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("owner_id")
      .eq("id", propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: "Proprietà non trovata" }, { status: 404 })
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    // Salva traduzione italiana
    await supabase
      .from("property_translations")
      .upsert({
        property_id: propertyId,
        locale: "it",
        name: name,
        description: description || null,
      }, {
        onConflict: "property_id,locale",
      })

    // Traduci e salva per tutte le altre lingue
    const translations = []
    for (const locale of locales) {
      if (locale === "it") continue

      const translatedName = await translateText(name, locale)
      const translatedDescription = description ? await translateText(description, locale) : null

      translations.push({
        property_id: propertyId,
        locale,
        name: translatedName,
        description: translatedDescription,
      })
    }

    if (translations.length > 0) {
      await supabase
        .from("property_translations")
        .upsert(translations, {
          onConflict: "property_id,locale",
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error translating property:", error)
    return NextResponse.json(
      { error: error.message || "Errore nella traduzione" },
      { status: 500 }
    )
  }
}
