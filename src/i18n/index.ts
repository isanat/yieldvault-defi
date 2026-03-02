import en from './locales/en/common.json';
import ptBR from './locales/pt-BR/common.json';
import es from './locales/es/common.json';

export const locales = {
  'en': en,
  'pt-BR': ptBR,
  'es': es,
} as const;

export type Locale = keyof typeof locales;
export type TranslationKeys = typeof en;

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'pt-BR': 'Português (BR)',
  'es': 'Español',
};

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'pt-BR': '🇧🇷',
  'es': '🇪🇸',
};

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}

/**
 * Replace interpolation placeholders with values
 */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * Translate a key with optional interpolation
 * This is the main translation function
 */
export function t(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>
): string {
  const translations = locales[locale] || locales[defaultLocale];
  let text = getNestedValue(translations as unknown as Record<string, unknown>, key);
  
  if (!text) {
    // Fallback to default locale
    text = getNestedValue(locales[defaultLocale] as unknown as Record<string, unknown>, key);
  }
  
  if (!text) {
    // Return key formatted nicely if translation not found
    return key.split('.').pop() || key;
  }
  
  return interpolate(text, values);
}

/**
 * Get all translations for a locale
 */
export function getTranslations(locale: Locale): TranslationKeys {
  return locales[locale] || locales[defaultLocale];
}

/**
 * Detect browser locale
 */
export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage;
  
  // Check for exact match
  if (browserLang in locales) {
    return browserLang as Locale;
  }
  
  // Check for language prefix match (e.g., 'pt' -> 'pt-BR')
  const prefix = browserLang.split('-')[0];
  const match = Object.keys(locales).find(loc => loc.startsWith(prefix));
  
  return match ? (match as Locale) : defaultLocale;
}

export { en, ptBR, es };
