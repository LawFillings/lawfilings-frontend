import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import * as casesClient from '../lib/casesClient';
import { formatDateOnly } from '../lib/casesClient';
import type { CaseRecord } from '../lib/casesClient';
import { listCaseTypes, type CaseTypeOption } from '../lib/catalogClient';
import { CaseCalendar } from '../components/CaseCalendar';
import './MyCasesPage.css';
import './AuthForm.css';

interface Props {
  onBack: () => void;
  onOpenCase: (caseId: string) => void;
  onOpenLogin: () => void;
}

const STATUS_TONE: Record<CaseRecord['status'], 'warn' | 'safe' | 'neutral'> = {
  assessing: 'warn',
  drafting: 'warn',
  ready: 'safe',
  filed: 'safe',
  disposed: 'neutral',
};

type VerificationStatus = 'not_applicable' | 'pending' | 'verified' | 'rejected';

const VERIFICATION_TONE: Record<VerificationStatus, 'warn' | 'safe' | 'neutral'> = {
  not_applicable: 'neutral',
  pending: 'warn',
  verified: 'safe',
  rejected: 'warn',
};

export function MyCasesPage({ onBack, onOpenCase, onOpenLogin }: Props) {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [cases, setCases] = useState<CaseRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newHearingDate, setNewHearingDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [caseTypes, setCaseTypes] = useState<CaseTypeOption[]>([]);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);

  const SUGGESTED_STATUSES = Object.values(t.caseDetail.suggestedStatuses);

  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const load = () => {
    if (!user || !token) return;
    casesClient
      .listCases(token)
      .then(setCases)
      .catch((err) => setError(err instanceof Error ? err.message : t.myCases.failedToLoad));
  };

  useEffect(load, [user, token]);

  useEffect(() => {
    listCaseTypes()
      .then(setCaseTypes)
      .catch(() => setCaseTypes([]));
  }, []);

  const caseTypesByForum = caseTypes.reduce<Record<string, CaseTypeOption[]>>((acc, ct) => {
    (acc[ct.forumType] ??= []).push(ct);
    return acc;
  }, {});

  const [customTypeEditingId, setCustomTypeEditingId] = useState<string | null>(null);
  const [customTypeDraft, setCustomTypeDraft] = useState('');

  const handleChangeType = async (caseId: string, type: { caseTypeId?: string | null; customTypeLabel?: string | null }) => {
    if (!token) return;
    setSavingTypeId(caseId);
    try {
      await casesClient.updateCaseType(caseId, type, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.myCases.failedToLoad);
    } finally {
      setSavingTypeId(null);
    }
  };

  const handleTypeSelect = (c: CaseRecord, value: string) => {
    if (value === '__custom__') {
      setCustomTypeDraft(c.customTypeLabel ?? '');
      setCustomTypeEditingId(c.id);
      return;
    }
    handleChangeType(c.id, { caseTypeId: value || null, customTypeLabel: null });
  };

  /** Clearing the text and blurring resets the case back to unassigned "Diary" — there's no other
   * way back from a custom label to the catalog select once one is set. */
  const handleSaveCustomType = async (caseId: string) => {
    const trimmed = customTypeDraft.trim();
    setCustomTypeEditingId(null);
    await handleChangeType(caseId, { caseTypeId: null, customTypeLabel: trimmed || null });
  };

  useEffect(() => {
    if (highlightedIds.length === 0) return;
    const timer = setTimeout(() => setHighlightedIds([]), 3000);
    return () => clearTimeout(timer);
  }, [highlightedIds]);

  const handleSelectDate = (_dateKey: string, casesOnDate: CaseRecord[]) => {
    const ids = casesOnDate.map((c) => c.id);
    setHighlightedIds(ids);
    const firstRow = rowRefs.current.get(ids[0]);
    firstRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAddDiaryCase = async () => {
    if (!token || !user || !newTitle.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await casesClient.createCase(
        { title: newTitle.trim(), ownerRole: user.role, status: 'assessing' },
        token
      );
      if (newStatusLabel.trim() || newHearingDate || newNote) {
        await casesClient.createStatusUpdate(
          created.id,
          {
            statusLabel: newStatusLabel.trim() || t.myCases.statusLabels.assessing,
            hearingDate: newHearingDate || undefined,
            note: newNote || undefined,
          },
          token
        );
      }
      setNewTitle('');
      setNewStatusLabel('');
      setNewHearingDate('');
      setNewNote('');
      setShowAddForm(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.myCases.failedToLoad);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-cases-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="my-cases-hero">
        <p className="my-cases-eyebrow">
          {t.myCases.yourAccount}
          {user?.role === 'advocate' && user.verificationStatus !== 'not_applicable' && (
            <span
              className={`my-cases-status-badge tone-${VERIFICATION_TONE[user.verificationStatus]}`}
              style={{ marginLeft: 'var(--space-2)' }}
            >
              {t.myCases.verificationLabels[user.verificationStatus]}
            </span>
          )}
        </p>
        <h1 className="my-cases-title">{t.myCases.title}</h1>
        <p className="my-cases-sub">{t.myCases.sub}</p>
      </header>

      {!user && (
        <div className="my-cases-empty">
          <p>{t.myCases.logInPrompt}</p>
          <button className="para-btn" onClick={onOpenLogin}>
            {t.common.logIn}
          </button>
        </div>
      )}

      {user && error && <div className="auth-error">{error}</div>}

      {user && !error && cases === null && <p className="step-help">{t.common.loading}</p>}

      {user && cases && (
        <div className="my-cases-diary-section">
          {!showAddForm ? (
            <button className="para-btn" onClick={() => setShowAddForm(true)}>
              {t.myCases.addDiaryCase}
            </button>
          ) : (
            <div className="my-cases-diary-form">
              <h3 className="my-cases-diary-form-heading">{t.myCases.diaryForm.heading}</h3>
              <label className="form-field">
                <span>{t.myCases.diaryForm.title}</span>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.myCases.diaryForm.titlePlaceholder}
                />
              </label>
              <div className="case-detail-chips">
                {SUGGESTED_STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={newStatusLabel === s ? 'case-detail-chip active' : 'case-detail-chip'}
                    onClick={() => setNewStatusLabel(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="form-field">
                <span>
                  {t.myCases.diaryForm.status} <span className="my-cases-optional">{t.myCases.diaryForm.statusOptional}</span>
                </span>
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder={t.caseDetail.statusPlaceholder}
                />
              </label>
              <label className="form-field">
                <span>
                  {t.myCases.diaryForm.hearingDate} <span className="my-cases-optional">{t.myCases.diaryForm.hearingDateOptional}</span>
                </span>
                <input type="date" value={newHearingDate} onChange={(e) => setNewHearingDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>
                  {t.myCases.diaryForm.note} <span className="my-cases-optional">{t.myCases.diaryForm.noteOptional}</span>
                </span>
                <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
              </label>
              {saveError && <div className="auth-error">{saveError}</div>}
              <div className="my-cases-diary-form-actions">
                <button className="my-cases-diary-submit" onClick={handleAddDiaryCase} disabled={saving || !newTitle.trim()}>
                  {saving ? t.myCases.diaryForm.submitting : t.myCases.diaryForm.submit}
                </button>
                <button className="para-btn" onClick={() => setShowAddForm(false)} disabled={saving}>
                  {t.myCases.diaryForm.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {user && cases && cases.length === 0 && (
        <p className="step-help">{t.myCases.noSavedCases}</p>
      )}

      {user && cases && cases.length > 0 && (
        <>
          <div className="my-cases-layout">
            <div className="my-cases-calendar-col">
              <CaseCalendar cases={cases} onSelectDate={handleSelectDate} />
            </div>

            <div className="my-cases-table-col">
              <div className="my-cases-table-wrap">
                <table className="my-cases-table">
                  <thead>
                    <tr>
                      <th>{t.myCases.tableHeaders.type}</th>
                      <th>{t.myCases.tableHeaders.case}</th>
                      <th>{t.myCases.tableHeaders.status}</th>
                      <th>{t.myCases.tableHeaders.nextHearing}</th>
                      <th>{t.myCases.tableHeaders.updatedOn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr
                        className={highlightedIds.includes(c.id) ? 'my-cases-row highlighted' : 'my-cases-row'}
                        key={c.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(c.id, el);
                          else rowRefs.current.delete(c.id);
                        }}
                        onClick={() => onOpenCase(c.id)}
                      >
                        <td className="my-cases-type-cell" onClick={(e) => e.stopPropagation()}>
                          {c.hasDraft ? (
                            c.caseTypeName ?? '—'
                          ) : customTypeEditingId === c.id ? (
                            <input
                              type="text"
                              className="my-cases-type-custom-input"
                              autoFocus
                              value={customTypeDraft}
                              placeholder={t.myCases.typeCustomPlaceholder}
                              onChange={(e) => setCustomTypeDraft(e.target.value)}
                              onBlur={() => handleSaveCustomType(c.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setCustomTypeEditingId(null);
                              }}
                            />
                          ) : c.customTypeLabel ? (
                            <button
                              type="button"
                              className="my-cases-type-custom-label"
                              disabled={savingTypeId === c.id}
                              onClick={() => {
                                setCustomTypeDraft(c.customTypeLabel ?? '');
                                setCustomTypeEditingId(c.id);
                              }}
                            >
                              {c.customTypeLabel}
                            </button>
                          ) : (
                            <select
                              className="my-cases-type-select"
                              value={c.caseTypeId ?? ''}
                              disabled={savingTypeId === c.id}
                              onChange={(e) => handleTypeSelect(c, e.target.value)}
                            >
                              <option value="">{t.myCases.diaryTag}</option>
                              <option value="__custom__">{t.myCases.typeOther}</option>
                              {Object.entries(caseTypesByForum).map(([forumType, types]) => (
                                <optgroup key={forumType} label={forumType}>
                                  {types.map((ct) => (
                                    <option key={ct.id} value={ct.id}>
                                      {ct.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="my-cases-row-title">{c.title}</td>
                        <td>
                          <span className={`my-cases-status-badge tone-${STATUS_TONE[c.status]}`}>
                            {c.latestStatusLabel ?? t.myCases.statusLabels[c.status]}
                          </span>
                        </td>
                        <td>{c.nextHearingDate ? formatDateOnly(c.nextHearingDate) : '—'}</td>
                        <td>{new Date(c.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
