import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import * as casesClient from '../lib/casesClient';
import { formatDateOnly } from '../lib/casesClient';
import type { CaseRecord, DraftRecord, StatusUpdateRecord } from '../lib/casesClient';
import { listCaseTypes, type CaseTypeOption } from '../lib/catalogClient';
import { caseTypes as allCaseTypes } from '../data/mockData';
import { resolveWizardCaseTypeId } from '../lib/draftResume';
import type { CaseType } from '../types';
import './CaseDetailPage.css';
import './AuthForm.css';
import './MyCasesPage.css';

const CUSTOM_TYPE_VALUE = '__custom__';

interface Props {
  caseId: string;
  onBack: () => void;
  /** Opens a draft back in its wizard, prefilled from its saved content, for further editing. */
  onOpenDraft: (draft: DraftRecord, caseType: CaseType) => void;
}

const STATUS_TONE: Record<CaseRecord['status'], 'warn' | 'safe' | 'neutral'> = {
  assessing: 'warn',
  drafting: 'warn',
  ready: 'safe',
  filed: 'safe',
  disposed: 'neutral',
};

export function CaseDetailPage({ caseId, onBack, onOpenDraft }: Props) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [caseRecord, setCaseRecord] = useState<(CaseRecord & { drafts: DraftRecord[] }) | null>(null);
  const [updates, setUpdates] = useState<StatusUpdateRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState('');
  const [note, setNote] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [caseTypes, setCaseTypes] = useState<CaseTypeOption[]>([]);
  const [editingCase, setEditingCase] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [typeSelectDraft, setTypeSelectDraft] = useState('');
  const [customTypeDraft, setCustomTypeDraft] = useState('');
  const [savingCase, setSavingCase] = useState(false);

  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editStatusLabel, setEditStatusLabel] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editHearingDate, setEditHearingDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [deletingCase, setDeletingCase] = useState(false);

  const SUGGESTED_STATUSES = Object.values(t.caseDetail.suggestedStatuses);

  const load = () => {
    if (!token) return;
    Promise.all([casesClient.getCase(caseId, token), casesClient.listStatusUpdates(caseId, token)])
      .then(([c, u]) => {
        setCaseRecord(c);
        setUpdates(u);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t.caseDetail.failedToLoad));
  };

  useEffect(load, [caseId, token]);

  useEffect(() => {
    listCaseTypes()
      .then(setCaseTypes)
      .catch(() => setCaseTypes([]));
  }, []);

  const caseTypesByForum = caseTypes.reduce<Record<string, CaseTypeOption[]>>((acc, ct) => {
    (acc[ct.forumType] ??= []).push(ct);
    return acc;
  }, {});

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !statusLabel) return;
    setSubmitting(true);
    try {
      await casesClient.createStatusUpdate(caseId, { statusLabel, note: note || undefined, hearingDate: hearingDate || undefined }, token);
      setStatusLabel('');
      setNote('');
      setHearingDate('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseDetail.failedToAddUpdate);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingCase = () => {
    if (!caseRecord) return;
    setTitleDraft(caseRecord.title);
    if (caseRecord.customTypeLabel) {
      setTypeSelectDraft(CUSTOM_TYPE_VALUE);
      setCustomTypeDraft(caseRecord.customTypeLabel);
    } else {
      setTypeSelectDraft(caseRecord.caseTypeId ?? '');
      setCustomTypeDraft('');
    }
    setEditingCase(true);
  };

  const handleSaveCase = async () => {
    if (!token) return;
    const trimmedTitle = titleDraft.trim();
    if (!trimmedTitle) {
      setError(t.caseDetail.titleRequired);
      return;
    }
    setSavingCase(true);
    try {
      await casesClient.updateCase(
        caseId,
        {
          title: trimmedTitle,
          caseTypeId: typeSelectDraft === CUSTOM_TYPE_VALUE ? null : typeSelectDraft || null,
          customTypeLabel: typeSelectDraft === CUSTOM_TYPE_VALUE ? customTypeDraft.trim() || null : null,
        },
        token
      );
      setEditingCase(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseDetail.failedToUpdateTitle);
    } finally {
      setSavingCase(false);
    }
  };

  const startEditingUpdate = (u: StatusUpdateRecord) => {
    setEditingUpdateId(u.id);
    setEditStatusLabel(u.statusLabel);
    setEditNote(u.note ?? '');
    setEditHearingDate(u.hearingDate ? u.hearingDate.slice(0, 10) : '');
  };

  const handleSaveUpdate = async (updateId: string) => {
    if (!token || !editStatusLabel) return;
    setSavingEdit(true);
    try {
      await casesClient.updateStatusUpdate(
        caseId,
        updateId,
        { statusLabel: editStatusLabel, note: editNote || undefined, hearingDate: editHearingDate || undefined },
        token
      );
      setEditingUpdateId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseDetail.failedToUpdateStatus);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!token || !window.confirm(t.caseDetail.confirmDeleteUpdate)) return;
    setDeletingUpdateId(updateId);
    try {
      await casesClient.deleteStatusUpdate(caseId, updateId, token);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseDetail.failedToDeleteUpdate);
    } finally {
      setDeletingUpdateId(null);
    }
  };

  const handleDeleteCase = async () => {
    if (!token || !window.confirm(t.caseDetail.confirmDeleteCase)) return;
    setDeletingCase(true);
    try {
      await casesClient.deleteCase(caseId, token);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseDetail.failedToDeleteCase);
      setDeletingCase(false);
    }
  };

  return (
    <div className="case-detail-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.backToMyCases}
      </button>

      {error && <div className="auth-error">{error}</div>}

      {!caseRecord && !error && <p className="step-help">{t.common.loading}</p>}

      {caseRecord && (
        <>
          <header className="case-detail-hero">
            <span className={`my-cases-status-badge tone-${STATUS_TONE[caseRecord.status]}`}>{t.myCases.statusLabels[caseRecord.status]}</span>

            {editingCase ? (
              <div className="case-detail-edit-block">
                <input
                  type="text"
                  className="case-detail-title-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                />
                <select
                  className="my-cases-type-select"
                  value={typeSelectDraft}
                  onChange={(e) => setTypeSelectDraft(e.target.value)}
                >
                  <option value="">{t.myCases.diaryTag}</option>
                  <option value={CUSTOM_TYPE_VALUE}>{t.myCases.typeOther}</option>
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
                {typeSelectDraft === CUSTOM_TYPE_VALUE && (
                  <input
                    type="text"
                    className="my-cases-type-custom-input"
                    value={customTypeDraft}
                    placeholder={t.myCases.typeCustomPlaceholder}
                    onChange={(e) => setCustomTypeDraft(e.target.value)}
                  />
                )}
                <button className="auth-submit" onClick={handleSaveCase} disabled={savingCase}>
                  {savingCase ? t.caseDetail.saving : t.caseDetail.save}
                </button>
                <button className="para-btn" onClick={() => setEditingCase(false)} disabled={savingCase}>
                  {t.caseDetail.cancel}
                </button>
              </div>
            ) : (
              <div className="case-detail-title-row">
                <h1 className="case-detail-title">{caseRecord.title}</h1>
                <button className="para-btn" onClick={startEditingCase}>
                  {t.caseDetail.editTitle}
                </button>
              </div>
            )}

            {!editingCase && (
              <p className="case-detail-type-line">
                {t.myCases.tableHeaders.type}: {caseRecord.customTypeLabel ?? caseRecord.caseTypeName ?? t.myCases.diaryTag}
              </p>
            )}

            <p className="case-detail-sub">{t.caseDetail.savedOn(new Date(caseRecord.createdAt).toLocaleDateString())}</p>
            <button className="case-detail-delete-case" onClick={handleDeleteCase} disabled={deletingCase}>
              {deletingCase ? t.caseDetail.deleting : t.caseDetail.deleteCase}
            </button>
          </header>

          {caseRecord.drafts.length > 0 && (
            <section className="case-detail-section">
              <h2 className="case-detail-section-title">{t.caseDetail.drafts}</h2>
              {caseRecord.drafts.map((d) => {
                const wizardCaseTypeId = resolveWizardCaseTypeId(d.content);
                const ct = wizardCaseTypeId ? allCaseTypes.find((c) => c.id === wizardCaseTypeId) : undefined;
                return ct ? (
                  <button
                    type="button"
                    className="case-detail-draft case-detail-draft-open"
                    key={d.id}
                    onClick={() => onOpenDraft(d, ct)}
                  >
                    <span>{d.title}</span>
                    <span className="case-detail-draft-meta">
                      {t.caseDetail.versionStatus(d.version, d.status)} · {t.caseDetail.openInWizard}
                    </span>
                  </button>
                ) : (
                  <div className="case-detail-draft" key={d.id}>
                    <span>{d.title}</span>
                    <span className="case-detail-draft-meta">{t.caseDetail.versionStatus(d.version, d.status)}</span>
                  </div>
                );
              })}
            </section>
          )}

          <section className="case-detail-section">
            <h2 className="case-detail-section-title">{t.caseDetail.caseStatus}</h2>
            <p className="step-help">{t.caseDetail.statusHelp}</p>

            <form onSubmit={handleAddUpdate} className="case-detail-update-form">
              <div className="case-detail-chips">
                {SUGGESTED_STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={statusLabel === s ? 'case-detail-chip active' : 'case-detail-chip'}
                    onClick={() => setStatusLabel(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>{t.caseDetail.status}</span>
                  <input type="text" required value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} placeholder={t.caseDetail.statusPlaceholder} />
                </label>
                <label className="form-field">
                  <span>{t.caseDetail.note}</span>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>{t.caseDetail.hearingDate}</span>
                  <input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} />
                </label>
              </div>
              <button className="auth-submit" type="submit" disabled={submitting || !statusLabel}>
                {submitting ? t.caseDetail.adding : t.caseDetail.addUpdate}
              </button>
            </form>

            {updates && updates.length === 0 && <p className="step-help">{t.caseDetail.noStatusUpdates}</p>}

            {updates && updates.length > 0 && (
              <ul className="case-detail-timeline">
                {updates.map((u) =>
                  editingUpdateId === u.id ? (
                    <li key={u.id} className="case-detail-timeline-item">
                      <div className="case-detail-chips">
                        {SUGGESTED_STATUSES.map((s) => (
                          <button
                            type="button"
                            key={s}
                            className={editStatusLabel === s ? 'case-detail-chip active' : 'case-detail-chip'}
                            onClick={() => setEditStatusLabel(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="form-grid">
                        <label className="form-field">
                          <span>{t.caseDetail.status}</span>
                          <input type="text" required value={editStatusLabel} onChange={(e) => setEditStatusLabel(e.target.value)} />
                        </label>
                        <label className="form-field">
                          <span>{t.caseDetail.note}</span>
                          <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                        </label>
                        <label className="form-field">
                          <span>{t.caseDetail.hearingDate}</span>
                          <input type="date" value={editHearingDate} onChange={(e) => setEditHearingDate(e.target.value)} />
                        </label>
                      </div>
                      <button className="auth-submit" onClick={() => handleSaveUpdate(u.id)} disabled={savingEdit || !editStatusLabel}>
                        {savingEdit ? t.caseDetail.saving : t.caseDetail.save}
                      </button>
                      <button className="para-btn" onClick={() => setEditingUpdateId(null)} disabled={savingEdit}>
                        {t.caseDetail.cancel}
                      </button>
                    </li>
                  ) : (
                    <li key={u.id} className="case-detail-timeline-item">
                      <span className="case-detail-timeline-label">{u.statusLabel}</span>
                      <span className="case-detail-timeline-date">{new Date(u.createdAt).toLocaleString()}</span>
                      {u.note && <p className="case-detail-timeline-note">{u.note}</p>}
                      {u.hearingDate && <p className="case-detail-timeline-note">{t.caseDetail.hearingLabel(formatDateOnly(u.hearingDate))}</p>}
                      <div className="case-detail-timeline-actions">
                        <button className="para-btn" onClick={() => startEditingUpdate(u)}>
                          {t.caseDetail.edit}
                        </button>
                        <button className="para-btn" onClick={() => handleDeleteUpdate(u.id)} disabled={deletingUpdateId === u.id}>
                          {deletingUpdateId === u.id ? t.caseDetail.deleting : t.caseDetail.delete}
                        </button>
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
