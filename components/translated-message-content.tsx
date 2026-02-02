"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "@/hooks/use-translation"
import { useI18n } from "@/lib/i18n/context"

interface TranslatedMessageContentProps {
  content: string
  renderLink?: (url: string, index: number) => React.ReactNode
  className?: string
}

/** Traduce il contenuto del messaggio e lo rende con link gestiti (es. pulsante Copia) */
export function TranslatedMessageContent({
  content,
  renderLink,
  className = "",
}: TranslatedMessageContentProps) {
  const { translate } = useTranslation()
  const { locale } = useI18n()
  const [translated, setTranslated] = useState(content)

  useEffect(() => {
    if (!content?.trim()) {
      setTranslated(content || "")
      return
    }
    if (locale === "it") {
      setTranslated(content)
      return
    }
    let cancelled = false
    translate(content).then((result) => {
      if (!cancelled) setTranslated(result)
    })
    return () => {
      cancelled = true
    }
  }, [content, locale, translate])

  const parts = translated.split(/(https?:\/\/[^\s]+)/g)

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
          return renderLink ? (
            renderLink(part, index)
          ) : (
            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              {part}
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </div>
  )
}
