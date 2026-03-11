'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation, LanguageCode, Language } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage, languages, currentLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (langCode: LanguageCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className={`
          ${variant === 'compact' 
            ? 'h-9 px-2 text-sm' 
            : 'h-10 px-3 text-sm'
          }
          text-gray-400 hover:text-white hover:bg-gray-800/50
          border border-gray-700/50 hover:border-gray-600
          flex items-center gap-2
        `}
      >
        <Globe className="w-4 h-4" />
        {variant === 'default' && (
          <>
            <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
            <span className="sm:hidden">{currentLanguage.flag}</span>
          </>
        )}
        {variant === 'compact' && (
          <span>{currentLanguage.flag}</span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            >
              <div className="p-1">
                {languages.map((lang: Language) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left
                      transition-colors
                      ${language === lang.code
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lang.nativeName}</p>
                      <p className="text-xs text-gray-500 truncate">{lang.name}</p>
                    </div>
                    {language === lang.code && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact button variant for mobile
export function LanguageSwitcherCompact({ className = '' }: { className?: string }) {
  return <LanguageSwitcher variant="compact" className={className} />;
}
