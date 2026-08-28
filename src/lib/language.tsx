import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from './translations/en';
import { hi } from './translations/hi';
import { pa } from './translations/pa';
import { gu } from './translations/gu';
import { as } from './translations/as';
import { bn } from './translations/bn';
import { mr } from './translations/mr';
import type { Translations } from './translations/en';

export type Language = 'en' | 'hi' | 'pa' | 'gu' | 'as' | 'bn' | 'mr';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ' },
  { id: 'gu', label: 'ગુજરાતી' },
  { id: 'as', label: 'অসমীয়া' },
  { id: 'bn', label: 'বাংলা' },
  { id: 'mr', label: 'मराठी' },
];

const DICTIONARIES: Record<Language, Translations> = { en, hi, pa, gu, as, bn, mr };

const STORAGE_KEY = 'legalassist:language';

function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.id === raw) ? (raw as Language) : 'en';
  } catch {
    return 'en';
  }
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(loadLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: DICTIONARIES[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
