/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react'
import { Language } from '../types'
import { languages, translations } from '../lib/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(languages.en)

  useEffect(() => {
    const savedLang = localStorage.getItem('language')
    if (savedLang && languages[savedLang]) {
      setLanguage(languages[savedLang])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('language', language.code)
    document.documentElement.dir = language.direction
    document.documentElement.lang = language.code
  }, [language])

  const t = (key: string): string => {
    return translations[language.code][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}