'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { translations, languages, Language } from './translations'

// Re-export languages for external use
export { languages }

const STORAGE_KEY = 'yieldvault-language'

// Global state for language (mutable for sync store)
let currentLanguage: Language = 'en'
let hasHydrated = false
const listeners = new Set<() => void>()

function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  
  const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage
  
  const langMap: Record<string, Language> = {
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'pt': 'pt-BR',
    'pt-BR': 'pt-BR',
    'pt-PT': 'pt-BR',
    'es': 'es',
    'es-ES': 'es',
    'es-MX': 'es',
    'es-AR': 'es',
    'fr': 'fr',
    'fr-FR': 'fr',
    'de': 'de',
    'de-DE': 'de',
    'de-AT': 'de',
  }
  
  return langMap[browserLang] || 'en'
}

function getStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && languages.find(l => l.code === stored)) {
      return stored as Language
    }
  } catch {
    // localStorage might not be available
  }
  return null
}

function hydrateLanguage() {
  if (hasHydrated) return
  hasHydrated = true
  
  const stored = getStoredLanguage()
  if (stored && stored !== currentLanguage) {
    currentLanguage = stored
    return
  }
  
  const detected = getBrowserLanguage()
  if (detected !== currentLanguage) {
    currentLanguage = detected
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  
  // Handle storage changes from other tabs
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const stored = getStoredLanguage()
      if (stored) {
        currentLanguage = stored
        listeners.forEach(l => l())
      }
    }
  }
  window.addEventListener('storage', storageHandler)
  
  // Hydrate on first subscription
  hydrateLanguage()
  
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', storageHandler)
  }
}

function getClientSnapshot(): Language {
  // Always return current language (starts as 'en', updates after hydration)
  return currentLanguage
}

function getServerSnapshot(): Language {
  // Server always renders 'en'
  return 'en'
}

function setLanguageGlobal(lang: Language) {
  currentLanguage = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage might not be available
  }
  listeners.forEach(l => l())
}

export function useTranslation() {
  // useSyncExternalStore ensures server and client snapshots match
  const language = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageGlobal(lang)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || translations['en']?.[key] || key
    
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, value]) => str.replace(`{${paramKey}}`, String(value)),
        translation
      )
    }
    
    return translation
  }, [language])

  return useMemo(() => ({
    t,
    language,
    setLanguage,
    languages,
  }), [t, language, setLanguage])
}
