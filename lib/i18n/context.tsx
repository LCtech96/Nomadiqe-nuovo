"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Locale, translations, locales, localeNames } from "./translations"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  availableLocales: Locale[]
  localeNames: Record<Locale, string>
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('it')

  useEffect(() => {
    // Carica la lingua salvata dal localStorage
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale)
    } else {
      // Rileva la lingua del browser
      const browserLang = navigator.language.split('-')[0] as Locale
      if (locales.includes(browserLang)) {
        setLocaleState(browserLang)
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
    // Aggiorna l'attributo lang dell'HTML
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale
    }
    // Forza il re-render di tutti i componenti che usano le traduzioni
    // Questo viene fatto automaticamente tramite il cambio di stato locale
  }

  const t = (key: string): string => {
    return translations[locale][key] || key
  }

  useEffect(() => {
    // Aggiorna l'attributo lang dell'HTML quando cambia la lingua
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        availableLocales: locales,
        localeNames,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
