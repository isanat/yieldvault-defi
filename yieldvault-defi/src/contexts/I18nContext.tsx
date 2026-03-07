'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Locale, 
  t as translateFn, 
  getTranslations, 
  localeNames,
  localeFlags,
  defaultLocale 
} from '@/i18n';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  translations: ReturnType<typeof getTranslations>;
  localeNames: typeof localeNames;
  localeFlags: typeof localeFlags;
  mounted: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'yieldvault_locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start with default locale for SSR consistency
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Initialize locale from localStorage after hydration
  useEffect(() => {
    const initLocale = () => {
      // Check localStorage
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && ['en', 'pt-BR', 'es'].includes(stored)) {
        return stored;
      }
      
      // Detect from browser
      const browserLang = navigator.language;
      if (browserLang.startsWith('pt')) {
        return 'pt-BR' as Locale;
      } else if (browserLang.startsWith('es')) {
        return 'es' as Locale;
      }
      
      return defaultLocale;
    };

    const detected = initLocale();
    setLocaleState(detected);
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>) => {
    return translateFn(locale, key, values);
  }, [locale]);

  const translations = getTranslations(locale);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    translations,
    localeNames,
    localeFlags,
    mounted,
  }), [locale, setLocale, t, translations, mounted]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export type { Locale };
