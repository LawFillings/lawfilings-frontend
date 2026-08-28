import { useState } from 'react';
import type { ForumLocation } from '../data/forumLocations';
import type { UserRole } from '../types';
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
  searchPlaceholder = 'Type to search…',
}: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const filtered = locations.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()));
  const selected = locations.find((l) => l.id === value);

  return (
    <div>
      <label className="field-label" htmlFor="location-search">
        {label}
      </label>
      <p className="bench-help">{helpText}</p>
      <input
        id="location-search"
        type="text"
        className="date-input"
        placeholder={searchPlaceholder}
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
        {filtered.length === 0 && <p className="bench-empty">No match — try a different search term.</p>}
      </div>
      {selected && (
        <div className="deadline-card status-safe" style={{ maxWidth: 420 }}>
          <p className="deadline-label">Selected</p>
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
        before filing.
      </p>
    </div>
  );
}
