"use client"

import React, { useEffect, useState } from "react"
import { useTranslation } from "@/hooks/use-translation"
import { useI18n } from "@/lib/i18n/context"

interface RenderLinkContentProps {
  content: string
  isHostPrime?: boolean
}

/**
 * Componente React che rende il contenuto del post con link cliccabili e traduzione automatica
 * @param content - Il contenuto del post
 * @param isHostPrime - Parametro legacy mantenuto per compatibilità (non più utilizzato)
 */
export function RenderLinkContent({ content, isHostPrime }: RenderLinkContentProps) {
  const { translate } = useTranslation()
  const { t } = useI18n()
  const [translatedContent, setTranslatedContent] = useState<string>(content)
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    let isMounted = true
    
    const loadTranslation = async () => {
      if (!content || !content.trim()) {
        if (isMounted) {
          setTranslatedContent(content)
        }
        return
      }
      
      // Se il contenuto è già quello tradotto, non fare nulla
      if (translatedContent === content && !isTranslating) {
        return
      }
      
      setIsTranslating(true)
      try {
        const translated = await translate(content)
        if (isMounted) {
          setTranslatedContent(translated)
        }
      } catch (error) {
        console.error("Translation error:", error)
        if (isMounted) {
          setTranslatedContent(content)
        }
      } finally {
        if (isMounted) {
          setIsTranslating(false)
        }
      }
    }

    loadTranslation()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  // Regex per trovare URL (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = translatedContent.split(urlRegex)
  
  // Crea un nuovo regex per testare ogni parte
  const testUrlRegex = /^https?:\/\/.+$/

  return (
    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
      {isTranslating && (
        <span className="text-xs text-muted-foreground italic">{t('post.translating')}</span>
      )}
      {parts.map((part, index) => {
        if (testUrlRegex.test(part)) {
          // È un URL, rendilo cliccabile
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
            </a>
          )
        }
        // Testo normale
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}

// Funzione di compatibilità per mantenere l'API esistente
export function renderLinkContent(content: string, isHostPrime?: boolean) {
  return <RenderLinkContent content={content} isHostPrime={isHostPrime} />
}

