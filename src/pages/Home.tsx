import { Fragment, useEffect, useRef, useState } from 'react';
import { forumRows, forumTabLabel } from '../data/forumPicker';
import { forums, caseTypes, appealGroups, caseTypeSubcategories, topCategories } from '../data/mockData';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { CaseType, AppealGroup } from '../types';
import './Home.css';

interface HomeProps {
  onBack: () => void;
  onSelectCaseType: (ct: CaseType) => void;
  onSelectAppealGroup: (group: AppealGroup) => void;
  onOpenSettings: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenFindAdvocate: () => void;
  initialForumType?: string;
}

// Case types reachable only through an appeal group's branching question, not as a standalone card
const caseTypeIdsInAppealGroups = new Set(
  appealGroups.flatMap((g) => g.options.map((o) => o.caseTypeId))
);

export function Home({ onBack, onSelectCaseType, onSelectAppealGroup, onOpenSettings, onOpenPrivacyPolicy, onOpenFindAdvocate, initialForumType }: HomeProps) {
  const { settings } = useSettings();
  const { color, widgets } = settings.home;
  const { t, language } = useLanguage();
  const [selectedForumType, setSelectedForumType] = useState<string | null>(initialForumType ?? null);
  const [selectedTopCategoryKey, setSelectedTopCategoryKey] = useState<string | null>(null);
  const [selectedSubcategoryKey, setSelectedSubcategoryKey] = useState<string | null>(null);

  // A selection here reveals new content in the results column — on a short viewport, or once
  // that column has grown tall with cards, the top of the picker (and the newly-revealed content)
  // can end up out of view. Bring the whole picker row back into view each time (not just the deep
  // child that changed — scrolling a tall nested child to the viewport's very top would push the
  // hero/court-button columns of that same row off the top of the screen, since every column
  // shares one page scroll position), skipping the very first render (e.g. an initialForumType
  // passed in from elsewhere shouldn't yank the page on mount).
  const hasMountedRef = useRef(false);
  const forumGroupRef = useRef<HTMLDivElement>(null);
  const topCategoryContentRef = useRef<HTMLDivElement>(null);
  const subcategoryContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if ((selectedForumType || selectedTopCategoryKey || selectedSubcategoryKey) && forumGroupRef.current) {
      forumGroupRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedForumType, selectedTopCategoryKey, selectedSubcategoryKey]);

  const selectForum = (forumType: string) => {
    setSelectedForumType((current) => (forumType === current ? null : forumType));
    setSelectedTopCategoryKey(null);
    setSelectedSubcategoryKey(null);
  };

  const selectTopCategory = (key: string) => {
    setSelectedTopCategoryKey((current) => (key === current ? null : key));
    setSelectedSubcategoryKey(null);
  };

  const categoryLabel: Record<string, string> = t.home.categoryLabels;
  const topCategoryLabel: Record<string, string> = t.home.topCategories;
  const subcategoryLabel: Record<string, string> = t.home.caseTypeSubcategories;
  const appealGroupQuestion: Record<string, { question: string }> = t.appealRouteGroups;
  const caseTypeSummary: Record<string, string> = t.caseTypeSummaries;

  const visibleForums = forums.filter((forum) => {
    const items = caseTypes.filter(
      (ct) => ct.forumType === forum.forumType && !caseTypeIdsInAppealGroups.has(ct.id)
    );
    const groups = appealGroups.filter((g) => g.forumType === forum.forumType);
    return items.length > 0 || groups.length > 0;
  });

  // Fixed button layout for the court/forum picker: one row per group, each centred (see data/forumPicker.ts).
  const rowOfForum = (type: string) => {
    const i = forumRows.findIndex((r) => r.includes(type));
    return i === -1 ? forumRows.length : i;
  };
  const orderedForums = [...visibleForums].sort((a, b) => {
    const ra = rowOfForum(a.forumType);
    const rb = rowOfForum(b.forumType);
    if (ra !== rb) return ra - rb;
    const flat = forumRows.flat();
    return flat.indexOf(a.forumType) - flat.indexOf(b.forumType);
  });

  const selectedForum = visibleForums.find((f) => f.forumType === selectedForumType) ?? null;
  const selectedItems = selectedForum
    ? caseTypes.filter(
        (ct) => ct.forumType === selectedForum.forumType && !caseTypeIdsInAppealGroups.has(ct.id)
      )
    : [];
  const selectedGroups = selectedForum
    ? appealGroups.filter((g) => g.forumType === selectedForum.forumType)
    : [];

  // Render under headed top-category tabs instead of one flat grid once every visible card for
  // this forum has been assigned a topCategory (currently district_court's Civil/Criminal/Family
  // and tax_matters' Income Tax/GST/Customs & Excise, since each forum's case types span
  // jurisdictions/regimes genuinely distinct from each other, unlike a single-purpose forum like
  // DRT or NCLT).
  const topCategorySections =
    selectedItems.length > 0 && selectedItems.every((ct) => ct.topCategory)
      ? topCategories
          .map((tc) => ({ ...tc, items: selectedItems.filter((ct) => ct.topCategory === tc.key) }))
          .filter((tc) => tc.items.length > 0)
      : null;
  const activeTopSection = topCategorySections?.find((tc) => tc.key === selectedTopCategoryKey) ?? null;
  // The set subcategory grouping actually operates on — the chosen top-category's items when this
  // forum has that tier, otherwise every item for the forum directly (the pre-existing behaviour).
  const workingItems = topCategorySections ? activeTopSection?.items ?? [] : selectedItems;

  // Render under headed subject-matter sections instead of one flat grid once every visible card
  // in the working set has been assigned a subcategory.
  const subcategorySections =
    workingItems.length > 0 && workingItems.every((ct) => ct.subcategory)
      ? caseTypeSubcategories
          .map((sc) => ({ ...sc, items: workingItems.filter((ct) => ct.subcategory === sc.key) }))
          .filter((sc) => sc.items.length > 0)
      : null;

  // Tint the case cards with the hue of the option button that revealed them (same 8-colour cycle
  // as the tab buttons in Home.css): the deepest tier the user has picked.
  const forumIdx = orderedForums.findIndex((f) => f.forumType === selectedForumType);
  const topIdx = topCategorySections ? topCategorySections.findIndex((tc) => tc.key === selectedTopCategoryKey) : -1;
  const subIdx = subcategorySections ? subcategorySections.findIndex((sc) => sc.key === selectedSubcategoryKey) : -1;
  const toneIdx = subIdx >= 0 ? subIdx : topIdx >= 0 ? topIdx : Math.max(forumIdx, 0);
  const cardTone = (toneIdx % 8) + 1;

  return (
    <div className="home" data-color-theme={color}>
      <div className="home-hero-top">
        <button className="back-link home-hero-back" onClick={onBack}>
          {t.common.back}
        </button>
        <div className="home-hero-controls">
          <LanguageSwitcher compact className="home-settings-link" />
          <button className="home-settings-link" onClick={onOpenSettings}>
            {t.home.settingsLink}
          </button>
        </div>
      </div>

      <div className="home-picker-band">
        <div className="home-picker-band-inner">
          <div className="picker-split">
            <div className="picker-split-left">
              <h1 className="home-title">{t.home.title}</h1>

              <div className="home-privacy-note">
                <button className="home-privacy-link" onClick={onOpenPrivacyPolicy}>
                  {t.landing.footer.privacyPolicy} {language === 'ur' ? '←' : '→'}
                </button>
              </div>

              <p className="home-advocate-mention">
                Prefer to hand this to a lawyer?{' '}
                <button className="home-privacy-link" onClick={onOpenFindAdvocate}>
                  Find a verified advocate {language === 'ur' ? '←' : '→'}
                </button>
              </p>
            </div>

            {!selectedForum && (
              <div className="picker-split-mid">
                <div className="forum-tabs">
                  {orderedForums.map((forum, i) => (
                    <Fragment key={forum.id}>
                      {i > 0 && rowOfForum(forum.forumType) !== rowOfForum(orderedForums[i - 1].forumType) && (
                        <span className="forum-tabs-break" aria-hidden="true" />
                      )}
                      <button
                        data-hue={(i % 8) + 1}
                        className={forum.forumType === selectedForumType ? 'forum-tab active' : 'forum-tab'}
                        onClick={() => selectForum(forum.forumType)}
                      >
                        {forumTabLabel[forum.forumType] ?? forum.name}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            <div
              className={selectedForum ? 'picker-split-right picker-split-right-wide' : 'picker-split-right'}
              data-tone={cardTone}
              ref={forumGroupRef}
            >
              {!selectedForum && <p className="subcategory-prompt">{t.home.pickACourtPrompt}</p>}

              {selectedForum && (
                <div ref={topCategoryContentRef}>
                  {/* Selecting a court hides the court-button column to leave more room for
                      results — this breadcrumb is the only way back to it, so the forum segment
                      is always clickable here, not just once a deeper tier has been picked. */}
                  <div className="picker-breadcrumb">
                    <button
                      type="button"
                      className="picker-breadcrumb-reset"
                      onClick={() => selectForum(selectedForumType!)}
                      aria-label={`${t.home.changeCategory}: ${selectedForum.name}`}
                    >
                      {selectedForum.name}
                      <span aria-hidden="true"> ✕</span>
                    </button>
                    {activeTopSection && (
                      <>
                        <span className="picker-breadcrumb-sep" aria-hidden="true">
                          ›
                        </span>
                        <button
                          type="button"
                          className="picker-breadcrumb-reset"
                          onClick={() => selectTopCategory(activeTopSection.key)}
                          aria-label={`${t.home.changeCategory}: ${topCategoryLabel[activeTopSection.key] ?? activeTopSection.label}`}
                        >
                          {topCategoryLabel[activeTopSection.key] ?? activeTopSection.label}
                          <span aria-hidden="true"> ✕</span>
                        </button>
                      </>
                    )}
                  </div>

                  {topCategorySections && !activeTopSection ? (
                    <div className="top-category-tabs">
                      {topCategorySections.map((tc) => (
                        <button
                          key={tc.key}
                          className={tc.key === selectedTopCategoryKey ? 'top-category-tab active' : 'top-category-tab'}
                          onClick={() => selectTopCategory(tc.key)}
                        >
                          {topCategoryLabel[tc.key] ?? tc.label}
                          <span className="top-category-tab-count">{tc.items.length}</span>
                        </button>
                      ))}
                    </div>
                  ) : subcategorySections ? (
                    <>
                      {selectedGroups.length > 0 && (
                        <div className="case-type-grid" style={{ marginBottom: 'var(--space-5)' }}>
                          {selectedGroups.map((g) => (
                            <button className="case-type-card" key={g.id} onClick={() => onSelectAppealGroup(g)}>
                              <span className="case-type-kind">{categoryLabel.appeal}</span>
                              <span className="case-type-name">{t.home.appeal}</span>
                              <span className="case-type-desc">{appealGroupQuestion[g.id].question}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="subcategory-tabs">
                        {subcategorySections.map((sc) => (
                          <button
                            key={sc.key}
                            className={sc.key === selectedSubcategoryKey ? 'subcategory-tab active' : 'subcategory-tab'}
                            onClick={() => setSelectedSubcategoryKey(sc.key === selectedSubcategoryKey ? null : sc.key)}
                          >
                            {subcategoryLabel[sc.key] ?? sc.label}
                            <span className="subcategory-tab-count">{sc.items.length}</span>
                          </button>
                        ))}
                      </div>
                      {(() => {
                        const activeSection = subcategorySections.find((sc) => sc.key === selectedSubcategoryKey);
                        return activeSection ? (
                          <div className="case-type-grid" ref={subcategoryContentRef} style={{ marginTop: 'var(--space-4)' }}>
                            {activeSection.items.map((ct) => (
                              <button className="case-type-card" key={ct.id} onClick={() => onSelectCaseType(ct)}>
                                <span className="case-type-kind">{categoryLabel[ct.filingCategory]}</span>
                                <span className="case-type-name">{ct.name}</span>
                                {widgets.caseDescriptions && ct.plainLanguageSummary && (
                                  <span className="case-type-desc">{caseTypeSummary[ct.id] ?? ct.plainLanguageSummary}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="subcategory-prompt">{t.home.pickACategory}</p>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="case-type-grid">
                      {selectedGroups.map((g) => (
                        <button className="case-type-card" key={g.id} onClick={() => onSelectAppealGroup(g)}>
                          <span className="case-type-kind">{categoryLabel.appeal}</span>
                          <span className="case-type-name">{t.home.appeal}</span>
                          <span className="case-type-desc">{appealGroupQuestion[g.id].question}</span>
                        </button>
                      ))}
                      {workingItems.map((ct) => (
                        <button className="case-type-card" key={ct.id} onClick={() => onSelectCaseType(ct)}>
                          <span className="case-type-kind">{categoryLabel[ct.filingCategory]}</span>
                          <span className="case-type-name">{ct.name}</span>
                          {widgets.caseDescriptions && ct.plainLanguageSummary && (
                            <span className="case-type-desc">{caseTypeSummary[ct.id] ?? ct.plainLanguageSummary}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
