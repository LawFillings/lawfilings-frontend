import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage, LANGUAGES, type Language } from '../lib/language';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { translateDocumentText } from '../lib/documentTranslationClient';
import { ApiError } from '../lib/apiError';
import { searchLibrarySections } from '../lib/searchLibrarySections';
import type { Act, ActSection } from '../data/lawLibraryData';
import './TranslateDocumentPage.css';

interface Props {
  onBack: () => void;
  onOpenLogin: () => void;
}

type Status = 'idle' | 'reading' | 'translating' | 'done' | 'error';
type SourceMode = 'upload' | 'search';

export function TranslateDocumentPage({ onBack, onOpenLogin }: Props) {
  const { user, token } = useAuth();
  const { t, language } = useLanguage();
  const copy = t.translateDocument;

  const [sourceMode, setSourceMode] = useState<SourceMode>('upload');
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<Language>(language);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchLibrarySections(searchQuery) : []),
    [searchQuery]
  );

  const switchMode = (mode: SourceMode) => {
    setSourceMode(mode);
    setSourceLabel(null);
    setSourceText('');
    setTranslatedText('');
    setError(null);
    setStatus('idle');
  };

  const handleFileSelected = async (file: File) => {
    setSourceLabel(file.name);
    setStatus('reading');
    setError(null);
    setTranslatedText('');
    try {
      const text = await extractTextFromPdf(file);
      setSourceText(text);
      setStatus('idle');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setError(copy.scannedError);
      } else {
        setError(copy.genericFileError);
      }
      setSourceText('');
      setStatus('error');
    }
  };

  const handleSectionSelected = (act: Act, section: ActSection) => {
    setSourceText(section.text);
    setSourceLabel(
      `${act.shortTitle} — ${t.lawLibrary.sectionHeading(
        section.sectionNo,
        section.heading,
        act.instrumentType === 'rules' ? t.lawLibrary.ruleUnit : undefined
      )}`
    );
    setTranslatedText('');
    setError(null);
    setStatus('idle');
  };

  const handleTranslate = async () => {
    if (!token || !sourceText) return;
    setStatus('translating');
    setError(null);
    setCopied(false);
    try {
      const result = await translateDocumentText(sourceText, targetLanguage, token);
      setTranslatedText(result.translatedText);
      setTruncated(result.truncated);
      setStatus('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.translationFailedError);
      setStatus('error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail silently (permissions, insecure context) — no worse than not
      // having tried, so there's nothing further to show the user here.
    }
  };

  return (
    <div className="td-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="td-hero">
        <p className="td-eyebrow">{copy.eyebrow}</p>
        <h1 className="td-title">{copy.title}</h1>
        <p className="td-sub">{copy.sub}</p>
      </header>

      <div className="td-disclaimer">{copy.disclaimer}</div>

      {!user && (
        <div className="td-login-gate">
          <p>{copy.logInPrompt}</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            {t.common.logIn}
          </button>
        </div>
      )}

      {user && (
        <div className="td-form">
          <div className="td-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === 'upload'}
              className={sourceMode === 'upload' ? 'td-mode-tab active' : 'td-mode-tab'}
              onClick={() => switchMode('upload')}
            >
              {copy.uploadTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === 'search'}
              className={sourceMode === 'search' ? 'td-mode-tab active' : 'td-mode-tab'}
              onClick={() => switchMode('search')}
            >
              {copy.searchTab}
            </button>
          </div>

          {sourceMode === 'upload' && (
            <>
              <label className="field-label" htmlFor="td-file">
                {copy.uploadLabel}
              </label>
              <input
                ref={fileInputRef}
                id="td-file"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleFileSelected(file);
                }}
              />
              <button type="button" className="para-btn" onClick={() => fileInputRef.current?.click()} disabled={status === 'reading'}>
                {status === 'reading' ? '…' : copy.chooseFile}
              </button>
              {sourceLabel && status !== 'error' && <span className="td-filename">{sourceLabel}</span>}
              <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                {copy.onlyTextPdf}
              </p>
            </>
          )}

          {sourceMode === 'search' && (
            <>
              <label className="field-label" htmlFor="td-search">
                {copy.searchTab}
              </label>
              <input
                id="td-search"
                type="text"
                className="td-select"
                placeholder={copy.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSourceLabel(null);
                  setSourceText('');
                  setTranslatedText('');
                }}
              />

              {searchQuery.trim() && (
                <div className="td-search-results">
                  {searchResults.length === 0 ? (
                    <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                      {copy.searchNoResults}
                    </p>
                  ) : (
                    <>
                      <p className="td-results-count">{t.lawLibrary.resultsCount(searchResults.length)}</p>
                      {searchResults.map(({ act, section }) => {
                        const heading = t.lawLibrary.sectionHeading(
                          section.sectionNo,
                          section.heading,
                          act.instrumentType === 'rules' ? t.lawLibrary.ruleUnit : undefined
                        );
                        const isSelected = sourceLabel === `${act.shortTitle} — ${heading}`;
                        return (
                          <button
                            type="button"
                            key={`${act.id}-${section.sectionNo}`}
                            className={isSelected ? 'td-section-card selected' : 'td-section-card'}
                            onClick={() => handleSectionSelected(act, section)}
                          >
                            <span className="td-section-act">{act.shortTitle}</span>
                            <span className="td-section-heading">{heading}</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p className="td-error">{error}</p>}

          {sourceText && (
            <>
              <label className="field-label" htmlFor="td-language" style={{ marginTop: 'var(--space-5)' }}>
                {copy.languageLabel}
              </label>
              <select
                id="td-language"
                className="td-select"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <button type="button" className="auth-submit" onClick={handleTranslate} disabled={status === 'translating'}>
                  {status === 'translating' ? copy.translating : copy.translateButton}
                </button>
              </div>
            </>
          )}

          {translatedText && (
            <div className="td-result">
              <div className="td-result-header">
                <h2 className="td-result-heading">{copy.resultHeading}</h2>
                <button type="button" className="para-btn" onClick={handleCopy}>
                  {copied ? copy.copied : copy.copy}
                </button>
              </div>
              {truncated && <p className="td-truncated-notice">{copy.truncatedNotice}</p>}
              <div className="td-result-text">{translatedText}</div>
              <p className="td-disclaimer td-disclaimer-inline">{copy.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
