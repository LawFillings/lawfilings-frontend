import { useState } from 'react';
import { forums, caseTypes, appealGroups } from '../data/mockData';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { CaseType, AppealGroup } from '../types';
import './Home.css';

interface HomeProps {
  onBack: () => void;
  onSelectCaseType: (ct: CaseType) => void;
  onSelectAppealGroup: (group: AppealGroup) => void;
  onOpenLawLibrary: () => void;
  onOpenSettings: () => void;
}

// Case types reachable only through an appeal group's branching question, not as a standalone card
const caseTypeIdsInAppealGroups = new Set(
  appealGroups.flatMap((g) => g.options.map((o) => o.caseTypeId))
);

export function Home({ onBack, onSelectCaseType, onSelectAppealGroup, onOpenLawLibrary, onOpenSettings }: HomeProps) {
  const { settings } = useSettings();
  const { color, widgets } = settings.home;
  const { t } = useLanguage();
  const [selectedForumType, setSelectedForumType] = useState<string | null>(null);

  const categoryLabel: Record<string, string> = t.home.categoryLabels;

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
          <h1 className="home-title home-title-centered">{t.home.title}</h1>

          {widgets.lawLibraryCta && (
            <div className="home-cta-row">
              <button className="ll-cta" onClick={onOpenLawLibrary}>
                {t.home.browseActs}
              </button>
            </div>
          )}

          <div className="forum-tabs">
            {visibleForums.map((forum) => (
              <button
                key={forum.id}
                className={forum.forumType === selectedForumType ? 'forum-tab active' : 'forum-tab'}
                onClick={() => setSelectedForumType(forum.forumType === selectedForumType ? null : forum.forumType)}
              >
                {forum.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedForum && (
        <section className="forum-group">
          <div className="case-type-grid">
            {selectedGroups.map((g) => (
              <button className="case-type-card" key={g.id} onClick={() => onSelectAppealGroup(g)}>
                <span className="case-type-kind">{categoryLabel.appeal}</span>
                <span className="case-type-name">{t.home.appeal}</span>
                <span className="case-type-desc">{g.question}</span>
              </button>
            ))}
            {selectedItems.map((ct) => (
              <button className="case-type-card" key={ct.id} onClick={() => onSelectCaseType(ct)}>
                <span className="case-type-kind">{categoryLabel[ct.filingCategory]}</span>
                <span className="case-type-name">{ct.name}</span>
                {widgets.caseDescriptions && ct.plainLanguageSummary && (
                  <span className="case-type-desc">{ct.plainLanguageSummary}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
