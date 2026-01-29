"use client"

import React, { useEffect, useState } from "react"
import { useTranslation } from "@/hooks/use-translation"
import { useI18n } from "@/lib/i18n/context"

interface TranslatedCommentProps {
  content: string
  className?: string
}

export function TranslatedComment({ content, className = "" }: TranslatedCommentProps) {
  const { translate } = useTranslation()
  const { t, locale } = useI18n()
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
  }, [content, locale, translate])

  return (
    <p className={className}>
      {isTranslating && (
        <span className="text-xs text-muted-foreground italic">{t('post.translating')}</span>
      )}
      {translatedContent}
    </p>
  )
}
