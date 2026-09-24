import { useEffect, useRef, useState } from 'react';
import type { ForumLocation } from '../data/forumLocations';
import type { UserRole } from '../types';
import { useLanguage } from '../lib/language';
import './LocationSelector.css';

interface LocationSelectorProps {
  mode: UserRole;
  locations: ForumLocation[];
  value?: string;
  onSelect: (locationId: string) => void;
  label: string;
  helpText: string;
  verifyNote: string;
  verifyUrl: string;
  searchPlaceholder?: string;
}

export function LocationSelector({
  locations,
  value,
  onSelect,
  label,
  helpText,
  verifyNote,
  verifyUrl,
  searchPlaceholder,
}: LocationSelectorProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const filtered = locations.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()));
  const selected = locations.find((l) => l.id === value);

  // A selection reveals the "Selected" confirmation, and sometimes more text after it — but the
  // actual next action is the wizard's own Continue button, outside this component entirely.
  // WizardShell renders it with a fixed, site-wide class, so target it directly rather than just
  // getting close via this component's own last element. Falls back to this component's end if
  // there's no Continue on the current step (e.g. the wizard's final step).
  // Skip the very first render (e.g. a value passed in from a saved draft).
  const rootRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (value) {
      const continueBtn = document.querySelector('.step-nav-btn.primary');
      (continueBtn ?? rootRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [value]);

  return (
    <div ref={rootRef}>
      <label className="field-label" htmlFor="location-search">
        {label}
      </label>
      <p className="bench-help">{helpText}</p>
      <input
        id="location-search"
        type="text"
        className="date-input"
        placeholder={searchPlaceholder ?? t.wizardShared.locationSearchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="bench-list">
        {filtered.map((l) => (
          <button
            key={l.id}
            className={l.id === value ? 'bench-item active' : 'bench-item'}
            onClick={() => onSelect(l.id)}
          >
            <span className="bench-city">{l.label}</span>
            {l.meta && <span className="bench-drat">{l.meta}</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="bench-empty">{t.wizardShared.locationNoMatch}</p>}
      </div>
      {selected && (
        <div className="deadline-card status-safe" style={{ maxWidth: 420 }}>
          <p className="deadline-label">{t.wizardShared.locationSelected}</p>
          <p className="deadline-body">
            {selected.label}
            {selected.meta ? ` — ${selected.meta}` : ''}
          </p>
        </div>
      )}
      <p className="bench-verify-note">
        {verifyNote}{' '}
        <a href={verifyUrl} target="_blank" rel="noreferrer">
          {verifyUrl.replace('https://', '')}
        </a>{' '}
        {t.wizardShared.locationVerifyBeforeFiling}
      </p>
    </div>
  );
}
