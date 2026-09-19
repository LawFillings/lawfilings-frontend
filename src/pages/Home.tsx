import { useState } from 'react';
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
}

// Case types reachable only through an appeal group's branching question, not as a standalone card
const caseTypeIdsInAppealGroups = new Set(
  appealGroups.flatMap((g) => g.options.map((o) => o.caseTypeId))
);

export function Home({ onBack, onSelectCaseType, onSelectAppealGroup, onOpenSettings, onOpenPrivacyPolicy }: HomeProps) {
  const { settings } = useSettings();
  const { color, widgets } = settings.home;
  const { t, language } = useLanguage();
  const [selectedForumType, setSelectedForumType] = useState<string | null>(null);
  const [selectedTopCategoryKey, setSelectedTopCategoryKey] = useState<string | null>(null);
  const [selectedSubcategoryKey, setSelectedSubcategoryKey] = useState<string | null>(null);

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
  const forumIdx = visibleForums.findIndex((f) => f.forumType === selectedForumType);
  const topIdx = topCategorySections ? topCategorySections.findIndex((tc) => tc.key === selectedTopCategoryKey) : -1;
  const subIdx = subcategorySections ? subcategorySections.findIndex((sc) => sc.key === selectedSubcategoryKey) : -1;
  const toneIdx = subIdx >= 0 ? subIdx : topIdx >= 0 ? topIdx : Math.max(forumIdx, 0);
  const cardTone = (toneIdx % 8) + 1;

  return (
    <div className="home" data-color-theme={color}>
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>
      <div className="home-hero-top">
        <p className="home-eyebrow">{t.home.eyebrow}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
                <p className="home-privacy-title">{t.home.privacyTitle} 🔒</p>
                <p className="home-privacy-body">{t.home.privacyBody}</p>
                <button className="home-privacy-link" onClick={onOpenPrivacyPolicy}>
                  {t.landing.footer.privacyPolicy} {language === 'ur' ? '←' : '→'}
                </button>
              </div>
            </div>

            <div className="picker-split-right">
              <div className="forum-tabs">
                {visibleForums.map((forum) => (
                  <button
                    key={forum.id}
                    className={forum.forumType === selectedForumType ? 'forum-tab active' : 'forum-tab'}
                    onClick={() => selectForum(forum.forumType)}
                  >
                    {forum.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedForum && (
        <section className="forum-group" data-tone={cardTone}>
          {topCategorySections && (
            <div className="pick-row">
              <h2 className="pick-row-title">{selectedForum.name}</h2>
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
            </div>
          )}
          {topCategorySections && !activeTopSection ? (
            <p className="subcategory-prompt">{t.home.pickACategory}</p>
          ) : subcategorySections ? (
            <>
              {selectedGroups.length > 0 && (
                <div className="case-type-grid" style={{ marginBottom: 'var(--space-6)' }}>
                  {selectedGroups.map((g) => (
                    <button className="case-type-card" key={g.id} onClick={() => onSelectAppealGroup(g)}>
                      <span className="case-type-kind">{categoryLabel.appeal}</span>
                      <span className="case-type-name">{t.home.appeal}</span>
                      <span className="case-type-desc">{appealGroupQuestion[g.id].question}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="pick-row">
                <h2 className="pick-row-title">
                  {activeTopSection ? topCategoryLabel[activeTopSection.key] ?? activeTopSection.label : selectedForum.name}
                </h2>
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
              </div>
              {(() => {
                const activeSection = subcategorySections.find((sc) => sc.key === selectedSubcategoryKey);
                return activeSection ? (
                  <div className="case-type-grid">
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
        </section>
      )}
    </div>
  );
}
