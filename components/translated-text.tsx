"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "@/hooks/use-translation"
import { useI18n } from "@/lib/i18n/context"

interface TranslatedTextProps {
  /** Testo da tradurre (es. messaggio, descrizione servizio, contenuto post) */
  text: string
  className?: string
  /** Tag HTML da usare come wrapper */
  as?: "span" | "p" | "div"
  /** Mostra "Traduzione..." durante il caricamento */
  showLoading?: boolean
}

/**
 * Traduce dinamicamente qualsiasi testo nella lingua selezionata.
 * Usa l'API /api/translate. Per locale=it restituisce il testo originale.
 */
export function TranslatedText({
  text,
  className = "",
  as: Component = "span",
  showLoading = false,
}: TranslatedTextProps) {
  const { translate } = useTranslation()
  const { locale, t } = useI18n()
  const [translated, setTranslated] = useState(text)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!text?.trim()) {
      setTranslated(text || "")
      return
    }
    if (locale === "it") {
      setTranslated(text)
      return
    }
    let cancelled = false
    setLoading(true)
    translate(text)
      .then((result) => {
        if (!cancelled) setTranslated(result)
      })
      .catch(() => {
        if (!cancelled) setTranslated(text)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [text, locale, translate])

  return (
    <Component className={className}>
      {showLoading && loading ? (
        <span className="text-muted-foreground italic text-xs">{t("post.translating")}</span>
      ) : (
        translated
      )}
    </Component>
  )
}
