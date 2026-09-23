import { useEffect, useState } from 'react';
import { forums } from '../data/mockData';
import { districtCourtStates } from '../data/districtCourtLocations';
import { LANGUAGES } from '../lib/language';
import { useAuth } from '../lib/auth';
import { getMyAdvocateProfile, saveMyAdvocateProfile, type AdvocateProfile } from '../lib/advocateDirectoryClient';
import { ApiError } from '../lib/apiError';
import { SearchableSelect } from '../components/SearchableSelect';
import './FindAdvocatePage.css';
import './MyAdvocateListingPage.css';

interface Props {
  onBack: () => void;
}

const EMPTY: AdvocateProfile = {
  city: null,
  practiceState: null,
  practiceForums: [],
  languages: [],
  bio: null,
  practicingSinceYear: null,
  listed: false,
};

export function MyAdvocateListingPage({ onBack }: Props) {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<AdvocateProfile | null>(null);
  const [city, setCity] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyAdvocateProfile(token)
      .then((p) => {
        setProfile(p);
        setCity(p.city ?? '');
      })
      .catch(() => {
        setProfile(EMPTY);
      });
  }, [token]);

  const isVerified = user?.verificationStatus === 'verified';

  const toggleForum = (f: string) =>
    setProfile((p) => (p ? { ...p, practiceForums: p.practiceForums.includes(f) ? p.practiceForums.filter((x) => x !== f) : [...p.practiceForums, f] } : p));
  const toggleLanguage = (l: string) =>
    setProfile((p) => (p ? { ...p, languages: p.languages.includes(l) ? p.languages.filter((x) => x !== l) : [...p.languages, l] } : p));

  const handleSave = async (listed: boolean) => {
    if (!token || !profile) return;
    setSaveState('saving');
    setError(null);
    try {
      const saved = await saveMyAdvocateProfile({ ...profile, city: city || null, listed }, token);
      setProfile(saved);
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setError(err instanceof ApiError ? err.message : "Couldn't save your listing — please try again.");
    }
  };

  if (user?.role !== 'advocate') {
    return (
      <div className="fa-page">
        <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0 }}>
          ← Back
        </button>
        <p className="step-help">This page is for advocate accounts.</p>
      </div>
    );
  }

  return (
    <div className="fa-page mal-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        ← Back
      </button>
      <h1 className="mal-title">My directory listing</h1>
      <p className="step-help">
        Opt in to appear in Find an Advocate, LawFilings' public, browsable directory. Nothing here is shared until
        you turn listing on below, and a prospective client only ever sees what you fill in here — never your
        contact details directly; they reach you by sending an inquiry through the platform.
      </p>

      {!isVerified && (
        <div className="ap-sent mal-verify-note" style={{ background: 'var(--status-warn-bg)', color: 'var(--status-warn-text)', borderColor: 'var(--status-warn-border)' }}>
          Your Bar Council verification is {user.verificationStatus === 'pending' ? 'still pending' : 'not yet complete'} — you
          can fill in your listing now, but it can only go live once verification is approved.
        </div>
      )}

      {profile && (
        <div className="mal-form">
          <div className="form-grid">
            <label className="form-field">
              <span>City</span>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chandigarh" />
            </label>
            <SearchableSelect
              label="State you practice in"
              placeholder="Choose a state"
              noMatches="No match"
              selectedKey={profile.practiceState ?? undefined}
              options={districtCourtStates.map((s) => ({ key: s.id, label: s.label }))}
              onSelect={(key) => setProfile((p) => (p ? { ...p, practiceState: key } : p))}
            />
            <label className="form-field">
              <span>Practicing since (year)</span>
              <input
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                value={profile.practicingSinceYear ?? ''}
                onChange={(e) => setProfile((p) => (p ? { ...p, practicingSinceYear: e.target.value ? Number(e.target.value) : null } : p))}
              />
            </label>
          </div>

          <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
            Forums you practice in
          </h3>
          <div className="grounds-grid">
            {forums.map((f) => (
              <button
                key={f.forumType}
                type="button"
                className={profile.practiceForums.includes(f.forumType) ? 'ground-card active' : 'ground-card'}
                onClick={() => toggleForum(f.forumType)}
              >
                {f.name}
              </button>
            ))}
          </div>

          <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
            Languages you work in
          </h3>
          <div className="grounds-grid">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                className={profile.languages.includes(l.id) ? 'ground-card active' : 'ground-card'}
                onClick={() => toggleLanguage(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>

          <label className="form-field" style={{ marginTop: 'var(--space-5)' }}>
            <span>Short bio (shown on your listing)</span>
            <textarea
              className="ap-textarea"
              rows={4}
              maxLength={800}
              value={profile.bio ?? ''}
              onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))}
            />
          </label>

          {error && <div className="fa-error">{error}</div>}

          <div className="mal-actions">
            <button className="para-btn" onClick={() => handleSave(false)} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving…' : 'Save (not listed)'}
            </button>
            <button
              className="para-btn"
              onClick={() => handleSave(true)}
              disabled={saveState === 'saving' || !isVerified}
              title={isVerified ? undefined : 'Verification must be approved first'}
            >
              {profile.listed ? 'Update listing (live)' : 'Save and go live'}
            </button>
            {profile.listed && (
              <button className="para-btn" onClick={() => handleSave(false)} disabled={saveState === 'saving'}>
                Remove from directory
              </button>
            )}
          </div>
          {saveState === 'saved' && (
            <p className="step-help" style={{ color: 'var(--status-safe-text)' }}>
              {profile.listed ? 'Live in the directory.' : 'Saved — not currently listed.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
