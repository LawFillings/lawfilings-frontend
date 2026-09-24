import { useEffect, useState } from 'react';
import { forums } from '../data/mockData';
import { districtCourtStates } from '../data/districtCourtLocations';
import { LANGUAGES, useLanguage } from '../lib/language';
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
  const { t } = useLanguage();
  const ml = t.advocateDirectory.myListing;
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<AdvocateProfile | null>(null);
  const [city, setCity] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyAdvocateProfile(token)
      .then((p) => {
        // Only ever pre-fill a genuinely untouched listing — an advocate who's already saved
        // something (even an empty-looking one they deliberately cleared) never gets overwritten.
        const isUntouched = !p.city && !p.practiceState && p.practiceForums.length === 0 && !p.listed;
        if (isUntouched && (p.suggestedForums.length > 0 || user?.barState)) {
          const matchedState = user?.barState
            ? districtCourtStates.find((s) => user.barState!.toLowerCase().includes(s.label.toLowerCase()))
            : undefined;
          setProfile({ ...p, practiceState: matchedState?.id ?? p.practiceState, practiceForums: p.suggestedForums });
          setPrefilled(true);
        } else {
          setProfile(p);
        }
        setCity(p.city ?? '');
      })
      .catch(() => {
        setProfile(EMPTY);
      });
  }, [token, user?.barState]);

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
      setError(err instanceof ApiError ? err.message : ml.saveError);
    }
  };

  if (user?.role !== 'advocate') {
    return (
      <div className="fa-page">
        <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0 }}>
          {t.common.back}
        </button>
        <p className="step-help">{t.advocateDirectory.advocateOnly}</p>
      </div>
    );
  }

  return (
    <div className="fa-page mal-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>
      <h1 className="mal-title">{ml.title}</h1>
      <p className="step-help">{ml.intro}</p>

      {!isVerified && (
        <div className="ap-sent mal-verify-note" style={{ background: 'var(--status-warn-bg)', color: 'var(--status-warn-text)', borderColor: 'var(--status-warn-border)' }}>
          {user.verificationStatus === 'pending' ? ml.verifyPending : ml.verifyIncomplete}
        </div>
      )}

      {prefilled && profile && (
        <div className="ap-sent mal-verify-note" style={{ background: 'var(--accent-tint)', color: 'var(--accent-deep)', borderColor: 'var(--accent)' }}>
          {ml.prefilledNote}
        </div>
      )}

      {profile && (
        <div className="mal-form">
          <div className="form-grid">
            <label className="form-field">
              <span>{ml.cityLabel}</span>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={ml.cityPlaceholder} />
            </label>
            <SearchableSelect
              label={ml.stateLabel}
              placeholder={ml.statePlaceholder}
              noMatches={ml.noMatch}
              selectedKey={profile.practiceState ?? undefined}
              options={districtCourtStates.map((s) => ({ key: s.id, label: s.label }))}
              onSelect={(key) => setProfile((p) => (p ? { ...p, practiceState: key } : p))}
            />
            <label className="form-field">
              <span>{ml.practicingSinceLabel}</span>
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
            {ml.forumsHeading}
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
            {ml.languagesHeading}
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
            <span>{ml.bioLabel}</span>
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
              {saveState === 'saving' ? ml.saving : ml.saveNotListed}
            </button>
            <button
              className="para-btn"
              onClick={() => handleSave(true)}
              disabled={saveState === 'saving' || !isVerified}
              title={isVerified ? undefined : ml.verificationRequiredTitle}
            >
              {profile.listed ? ml.updateListing : ml.saveAndGoLive}
            </button>
            {profile.listed && (
              <button className="para-btn" onClick={() => handleSave(false)} disabled={saveState === 'saving'}>
                {ml.removeFromDirectory}
              </button>
            )}
          </div>
          {saveState === 'saved' && (
            <p className="step-help" style={{ color: 'var(--status-safe-text)' }}>
              {profile.listed ? ml.liveInDirectory : ml.savedNotListed}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
