import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ColorTheme = 'amber' | 'teal' | 'crimson' | 'indigo';

export const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  // id stays 'amber' for compatibility with anyone's already-saved localStorage settings — only
  // the label/swatch shown here were wrong. This preset never had its own CSS rule; it always
  // fell through to :root's navy accent (tokens.css), so "Amber" with an amber swatch was
  // describing a color it never actually rendered. Now matched to what it's always looked like.
  { id: 'amber', label: 'Navy (default)', swatch: '#1F3A5F' },
  { id: 'teal', label: 'Teal', swatch: '#2F7A6B' },
  { id: 'crimson', label: 'Crimson', swatch: '#A6383E' },
  { id: 'indigo', label: 'Indigo', swatch: '#3E4A9A' },
];

export type PageKey = 'landing' | 'home' | 'lawLibrary' | 'wizard';

export interface PageConfig {
  color: ColorTheme;
  widgets: Record<string, boolean>;
}

export type PageSettings = Record<PageKey, PageConfig>;

interface WidgetDef {
  key: string;
  label: string;
  description: string;
}

export const PAGE_LABELS: Record<PageKey, string> = {
  landing: 'Landing page',
  home: 'Home (filing picker)',
  lawLibrary: 'Law Library',
  wizard: 'Filing wizards (all case types)',
};

export const WIDGET_DEFS: Record<PageKey, WidgetDef[]> = {
  landing: [
    { key: 'howItWorks', label: 'How it works', description: 'The three-step explainer section.' },
    { key: 'lawLibraryTeaser', label: 'Law Library teaser', description: 'Grid of Acts linking into the Law Library.' },
    { key: 'whyChooseUs', label: 'Why Choose Us', description: 'Feature-highlight grid explaining what the platform does today.' },
    { key: 'whoItsFor', label: "Who It's For", description: 'Audience cards — advocates, self-represented litigants, corporates, law students.' },
    { key: 'news', label: 'Law news', description: 'Verified law-change news cards.' },
  ],
  home: [
    { key: 'lawLibraryCta', label: 'Law Library button', description: 'The button linking to the Law Library.' },
    { key: 'caseDescriptions', label: 'Case descriptions', description: 'Plain-language summary text on each case-type card.' },
  ],
  lawLibrary: [
    { key: 'search', label: 'Search bar', description: 'The free-text search box across all Acts.' },
    {
      key: 'askAi',
      label: 'Ask a question about the Law Library',
      description: 'Q&A box below the Constitution/Acts dropdown, answered strictly from Acts sourced into the Library.',
    },
  ],
  wizard: [
    {
      key: 'thirdPartyNudge',
      label: 'Third-party mention nudge',
      description: 'Hint shown in the Consumer Complaint facts step when other people are named.',
    },
    {
      key: 'casePrecedents',
      label: 'Relevant case law',
      description: 'Curated precedents shown alongside the grounds/dispute-type step, where available.',
    },
    {
      key: 'actReferences',
      label: 'Relevant Act provisions',
      description: 'Specific Act sections (e.g. a state\'s Money-Lenders Act) shown when a wizard selection matches one, where available.',
    },
  ],
};

const STORAGE_KEY = 'legalassist:page-settings';

export const defaultSettings: PageSettings = {
  landing: { color: 'amber', widgets: Object.fromEntries(WIDGET_DEFS.landing.map((w) => [w.key, true])) },
  home: { color: 'amber', widgets: Object.fromEntries(WIDGET_DEFS.home.map((w) => [w.key, true])) },
  lawLibrary: { color: 'amber', widgets: Object.fromEntries(WIDGET_DEFS.lawLibrary.map((w) => [w.key, true])) },
  wizard: { color: 'amber', widgets: Object.fromEntries(WIDGET_DEFS.wizard.map((w) => [w.key, true])) },
};

function loadSettings(): PageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<PageSettings>;
    const merged = {} as PageSettings;
    (Object.keys(defaultSettings) as PageKey[]).forEach((page) => {
      merged[page] = {
        color: parsed[page]?.color ?? defaultSettings[page].color,
        widgets: { ...defaultSettings[page].widgets, ...parsed[page]?.widgets },
      };
    });
    return merged;
  } catch {
    return defaultSettings;
  }
}

interface SettingsContextValue {
  settings: PageSettings;
  setColor: (page: PageKey, color: ColorTheme) => void;
  setWidget: (page: PageKey, widgetKey: string, value: boolean) => void;
  resetPage: (page: PageKey) => void;
  resetAll: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PageSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setColor = (page: PageKey, color: ColorTheme) => {
    setSettings((prev) => ({ ...prev, [page]: { ...prev[page], color } }));
  };

  const setWidget = (page: PageKey, widgetKey: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [page]: { ...prev[page], widgets: { ...prev[page].widgets, [widgetKey]: value } },
    }));
  };

  const resetPage = (page: PageKey) => {
    setSettings((prev) => ({ ...prev, [page]: defaultSettings[page] }));
  };

  const resetAll = () => setSettings(defaultSettings);

  return (
    <SettingsContext.Provider value={{ settings, setColor, setWidget, resetPage, resetAll }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
