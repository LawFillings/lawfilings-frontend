import { useMemo, useState } from 'react';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import { legalDictionaryTerms, type DictionaryCategory, type DictionaryTerm } from '../data/legalDictionary';
import { legalDictionaryDefinitionTranslations } from '../data/legalDictionaryTranslations';
import '../styles/split-page.css';
import './LegalDictionaryPage.css';

interface Props {
  onBack: () => void;
  onOpenLawLibrary: () => void;
}

export function LegalDictionaryPage({ onBack, onOpenLawLibrary }: Props) {
  const { t, language } = useLanguage();
  const c = t.legalDictionaryPage;

  // The term/example stay English (headwords and usage lines, same convention as Law Library's
  // Act text); only the definition itself is translated, with English as the fallback wherever a
  // given term/language pair hasn't been translated yet.
  const getDefinition = (term: DictionaryTerm) =>
    language === 'en' ? term.definition : (legalDictionaryDefinitionTranslations[language]?.[term.id] ?? term.definition);
  const [category, setCategory] = useState<DictionaryCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories: { id: DictionaryCategory | 'all'; label: string }[] = [
    { id: 'all', label: c.categoryAll },
    { id: 'general_procedure', label: c.categoryGeneralProcedure },
    { id: 'pleadings_documents', label: c.categoryPleadingsDocuments },
    { id: 'evidence', label: c.categoryEvidence },
    { id: 'criminal_procedure', label: c.categoryCriminalProcedure },
    { id: 'civil_remedies', label: c.categoryCivilRemedies },
    { id: 'tribunals_forums', label: c.categoryTribunalsForums },
    { id: 'company_law', label: c.categoryCompanyLaw },
    { id: 'property_law', label: c.categoryPropertyLaw },
    { id: 'latin_maxims', label: c.categoryLatinMaxims },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return legalDictionaryTerms
      .filter((term) => category === 'all' || term.category === category)
      .filter((term) => {
        if (!q) return true;
        return (
          term.term.toLowerCase().includes(q) ||
          getDefinition(term).toLowerCase().includes(q) ||
          (term.alsoKnownAs ?? []).some((a) => a.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [category, query, language]);

  const selected: DictionaryTerm | undefined = selectedId
    ? legalDictionaryTerms.find((term) => term.id === selectedId)
    : undefined;

  return (
    <div className="ld-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <div className="trio-card">
        <aside className="trio-left">
          <p className="ld-eyebrow">{c.eyebrow}</p>
          <h1 className="ld-title">{c.title}</h1>
          <p className="ld-sub">{c.sub}</p>

          <div className="trio-filter" role="tablist" aria-label={c.categoryAll}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={category === cat.id ? 'trio-filter-btn active' : 'trio-filter-btn'}
                onClick={() => {
                  setCategory(cat.id);
                  setSelectedId(null);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="trio-center">
          <input
            type="text"
            className="ld-search-input"
            placeholder={c.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {filtered.length === 0 ? (
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              {c.noResults}
            </p>
          ) : (
            <ul className="ld-term-list">
              {filtered.map((term) => (
                <li key={term.id}>
                  <button
                    type="button"
                    className={term.id === selectedId ? 'ld-term-row active' : 'ld-term-row'}
                    onClick={() => setSelectedId(term.id)}
                  >
                    <span className="ld-term-row-title">{term.term}</span>
                    <span className="ld-term-row-snippet">{getDefinition(term)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>

        <aside className="trio-right">
          {selected ? (
            <div className="ld-detail">
              <p className="ld-detail-category">{categories.find((cat) => cat.id === selected.category)?.label}</p>
              <h2 className="ld-detail-term">{selected.term}</h2>
              <p className="ld-detail-definition">{getDefinition(selected)}</p>
              <div className="ld-detail-example">
                <p className="ld-detail-example-label">{c.exampleLabel}</p>
                <p className="ld-detail-example-text">{selected.example}</p>
              </div>
              {selected.alsoKnownAs && selected.alsoKnownAs.length > 0 && (
                <p className="ld-detail-aka">{fmt(c.alsoKnownAs, { names: selected.alsoKnownAs.join(', ') })}</p>
              )}
            </div>
          ) : (
            <p className="step-help">{c.selectPrompt}</p>
          )}

          <button type="button" className="trio-nudge-card" onClick={onOpenLawLibrary}>
            {c.lawLibraryNudge}
          </button>
          <button type="button" className="trio-nudge-card trio-nudge-card-solid" onClick={onOpenLawLibrary}>
            {c.lawLibraryNudgeLink}
          </button>
        </aside>
      </div>
    </div>
  );
}
