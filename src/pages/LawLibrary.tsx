import { useMemo, useState } from 'react';
import { acts, INDIAN_STATES_AND_UTS } from '../data/lawLibraryData';
import type { Act, ActSection } from '../data/lawLibraryData';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { AskTheLibrary } from '../components/AskTheLibrary';
import './LawLibrary.css';

interface Props {
  onBack: () => void;
  /** Set when the persistent site nav's Law Library submenu links directly into a category
   * (e.g. "Central Acts"), so the page skips its own default constitution-first landing state. */
  initialCategory?: ActCategory;
  onOpenLogin: () => void;
}

export type ActCategory = 'constitution' | 'central' | 'state' | 'rules';

const constitutionAct = acts.find((act) => act.id === 'act-constitution-india') ?? null;

export function LawLibrary({ onBack, initialCategory, onOpenLogin }: Props) {
  const { settings } = useSettings();
  const { color, widgets } = settings.lawLibrary;
  const { t } = useLanguage();
  const [selectedAct, setSelectedAct] = useState<Act | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ActCategory>(initialCategory ?? 'constitution');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  const openAct = (act: Act) => {
    setSelectedAct(act);
  };

  const changeCategory = (next: ActCategory) => {
    setCategory(next);
    setSelectedState(null);
    setSelectedAct(null);
    setSelectedPart(null);
  };

  const visibleActs = acts.filter((act) => {
    if (category === 'rules') return act.instrumentType === 'rules';
    if (category === 'central') return act.jurisdiction.type === 'central' && act.id !== 'act-constitution-india' && act.instrumentType !== 'rules';
    return act.jurisdiction.type === 'state' && act.jurisdiction.state === selectedState && act.instrumentType !== 'rules';
  });

  const constitutionParts = useMemo(() => {
    if (!constitutionAct) return [];
    const seen = new Set<string>();
    const order: string[] = [];
    for (const section of constitutionAct.sections) {
      const label = section.part ?? '';
      if (label && !seen.has(label)) {
        seen.add(label);
        order.push(label);
      }
    }
    return order;
  }, []);

  const articlesInSelectedPart = useMemo(
    () => (constitutionAct && selectedPart ? constitutionAct.sections.filter((s) => s.part === selectedPart) : []),
    [selectedPart]
  );

  const statesWithActs = useMemo(
    () =>
      INDIAN_STATES_AND_UTS.filter((s) =>
        acts.some((act) => act.jurisdiction.type === 'state' && act.jurisdiction.state === s)
      ),
    []
  );

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return null;
    const q = query.toLowerCase();
    const results: { act: Act; section: ActSection }[] = [];
    for (const act of acts) {
      for (const section of act.sections) {
        if (
          section.heading.toLowerCase().includes(q) ||
          section.text.toLowerCase().includes(q) ||
          section.sectionNo.toLowerCase() === q
        ) {
          results.push({ act, section });
        }
      }
    }
    return results;
  }, [query]);

  return (
    <div className="law-library" data-color-theme={color}>
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.backToAllFilings}
      </button>

      <header className="ll-hero">
        <p className="ll-eyebrow">{t.lawLibrary.eyebrow}</p>
        <h1 className="ll-title">{t.lawLibrary.title}</h1>
        <p className="ll-sub">{t.lawLibrary.sub}</p>
        {widgets.search && (
          <input
            type="text"
            className="ll-search"
            placeholder={t.lawLibrary.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedAct(null);
            }}
          />
        )}
      </header>

      {widgets.askAi && <AskTheLibrary onOpenLogin={onOpenLogin} />}

      <div className="ll-layout">
        <nav className="ll-category-rail" aria-label="Act category">
          {(
            [
              ['constitution', t.lawLibrary.categoryConstitution],
              ['central', t.lawLibrary.categoryCentralActs],
              ['state', t.lawLibrary.categoryStateActs],
              ['rules', t.lawLibrary.categoryRules],
            ] as [ActCategory, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`ll-category-rail-btn${category === value && !query ? ' active' : ''}`}
              onClick={() => {
                setQuery('');
                changeCategory(value);
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ll-main">
      {widgets.search && searchResults && (
        <div className="ll-results">
          <p className="ll-results-count">{t.lawLibrary.resultsCount(searchResults.length)}</p>
          {searchResults.map(({ act, section }) => (
            <div className="ll-section-card" key={`${act.id}-${section.sectionNo}`}>
              <p className="ll-section-act">{act.shortTitle}</p>
              <p className="ll-section-heading">
                {t.lawLibrary.sectionHeading(
                  section.sectionNo,
                  section.heading,
                  act.instrumentType === 'rules' ? t.lawLibrary.ruleUnit : undefined
                )}
              </p>
              <p className="ll-section-text">{section.text}</p>
            </div>
          ))}
        </div>
      )}

      {!query && !selectedAct && !selectedPart && (
        <div>
          <div className="ll-category-filter">
            <select
              className="ll-category-select"
              aria-label="Act category"
              value={category}
              onChange={(e) => changeCategory(e.target.value as ActCategory)}
            >
              <option value="constitution">{t.lawLibrary.categoryConstitution}</option>
              <option value="central">{t.lawLibrary.categoryCentralActs}</option>
              <option value="state">{t.lawLibrary.categoryStateActs}</option>
              <option value="rules">{t.lawLibrary.categoryRules}</option>
            </select>
          </div>

          {category === 'constitution' && constitutionAct && (
            <div className="ll-act-picker">
              <p className="ll-state-search-label">{t.lawLibrary.selectPartLabel}</p>
              <div className="ll-option-list">
                {constitutionParts.map((part) => (
                  <button key={part} type="button" className="ll-option-list-item" onClick={() => setSelectedPart(part)}>
                    <span className="ll-option-list-item-title">{part}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'state' && (
            <div className="ll-state-picker">
              <label className="ll-state-search-label" htmlFor="ll-state-select">
                {t.lawLibrary.selectStateLabel}
              </label>
              <select
                id="ll-state-select"
                className="ll-state-select"
                value={selectedState ?? ''}
                onChange={(e) => setSelectedState(e.target.value || null)}
              >
                <option value="">{t.lawLibrary.selectStatePlaceholder}</option>
                {statesWithActs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(category === 'central' || category === 'rules' || (category === 'state' && selectedState)) && (
            <div className="ll-act-picker ll-act-picker-wide">
              {visibleActs.length > 0 ? (
                <>
                  <p className="ll-state-search-label">{t.lawLibrary.selectActLabel}</p>
                  <div className="ll-option-list">
                    {visibleActs.map((act) => (
                      <button key={act.id} type="button" className="ll-option-list-item" onClick={() => openAct(act)}>
                        <span className="ll-option-list-item-title">
                          {act.shortTitle}
                          {act.status === 'repealed' && <span className="ll-repealed-tag">{t.lawLibrary.repealedTag}</span>}
                        </span>
                        <span className="ll-option-list-item-meta">{t.lawLibrary.actMeta(act.actNumber)}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                category === 'state' && selectedState && <p className="ll-state-empty">{t.lawLibrary.noActsForState(selectedState)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!query && category === 'constitution' && selectedPart && constitutionAct && (
        <div>
          <button className="para-btn" style={{ marginBottom: 'var(--space-5)' }} onClick={() => setSelectedPart(null)}>
            {t.lawLibrary.changePart}
          </button>
          <h2 className="ll-act-detail-title">{constitutionAct.shortTitle}</h2>
          <p className="ll-act-detail-subtitle">{selectedPart}</p>
          <p className="ll-act-source">
            {t.lawLibrary.source}{' '}
            <a href={constitutionAct.sourceUrl} target="_blank" rel="noreferrer">
              {new URL(constitutionAct.sourceUrl).hostname}
            </a>
          </p>
          {articlesInSelectedPart.map((section) => (
            <div className="ll-section-card" key={section.sectionNo}>
              <p className="ll-section-heading">
                {section.sectionNo} — {section.heading}
              </p>
              {section.text ? (
                <p className="ll-section-text">{section.text}</p>
              ) : (
                <p className="ll-section-text ll-section-not-sourced">
                  {t.lawLibrary.notYetAdded}{' '}
                  <a href={constitutionAct.sourceUrl} target="_blank" rel="noreferrer">
                    {new URL(constitutionAct.sourceUrl).hostname}
                  </a>
                  .
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!query && selectedAct && (
        <div>
          <button className="para-btn" style={{ marginBottom: 'var(--space-5)' }} onClick={() => setSelectedAct(null)}>
            {t.lawLibrary.allActs}
          </button>
          <h2 className="ll-act-detail-title">{selectedAct.shortTitle}</h2>
          {selectedAct.instrumentType === 'rules' && (
            <p className="ll-act-detail-subtitle">{t.lawLibrary.rulesBadge}</p>
          )}
          {selectedAct.status === 'repealed' &&
            (() => {
              const successor = acts.find((a) => a.id === selectedAct.supersededByActId);
              return (
                <div className="ll-repealed-banner">
                  <p>
                    {successor ? t.lawLibrary.repealedBanner(successor.shortTitle) : t.lawLibrary.repealedBannerNoSuccessor}
                  </p>
                  {successor && (
                    <button type="button" className="para-btn" onClick={() => openAct(successor)}>
                      {t.lawLibrary.viewCurrentAct}
                    </button>
                  )}
                </div>
              );
            })()}
          <p className="ll-act-source">
            {t.lawLibrary.source}{' '}
            <a href={selectedAct.sourceUrl} target="_blank" rel="noreferrer">
              {new URL(selectedAct.sourceUrl).hostname}
            </a>
          </p>
          {selectedAct.sections.map((section) => (
            <div className="ll-section-card" key={section.sectionNo}>
              <p className="ll-section-heading">
                {t.lawLibrary.sectionHeading(
                  section.sectionNo,
                  section.heading,
                  selectedAct.instrumentType === 'rules' ? t.lawLibrary.ruleUnit : undefined
                )}
              </p>
              <p className="ll-section-text">{section.text}</p>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
