import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { analyzeJudgeStyleFromTexts, type JudgeStyleProfile } from '../lib/judgeStyleClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from './PaywallBlock';
import type { Translations } from '../lib/translations/en';

interface Props {
  profile: JudgeStyleProfile | null;
  onProfileReady: (profile: JudgeStyleProfile | null) => void;
  onOpenPricing: () => void;
}

type SourceType = 'judgment' | 'application';

function citationDensityLabel(t: Translations, density: JudgeStyleProfile['citationDensity']): string {
  const j = t.wizardShared.judgeStyle;
  return density === 'high' ? j.citationDensityHigh : density === 'low' ? j.citationDensityLow : j.citationDensityNeutral;
}

function sourceTypeCopy(t: Translations, sourceType: SourceType) {
  const j = t.wizardShared.judgeStyle;
  return sourceType === 'judgment'
    ? {
        helpText: j.judgmentHelpText,
        chooseFileLabel: j.judgmentChooseFileLabel,
        scannedErrorNoun: j.judgmentScannedErrorNoun,
        analyzeLabel: j.judgmentAnalyzeLabel,
        profileLabel: j.judgmentProfileLabel,
      }
    : {
        helpText: j.applicationHelpText,
        chooseFileLabel: j.applicationChooseFileLabel,
        scannedErrorNoun: j.applicationScannedErrorNoun,
        analyzeLabel: j.applicationAnalyzeLabel,
        profileLabel: j.applicationProfileLabel,
      };
}

/** Optional, on-demand, paid-plan step every wizard can insert before Preview: the user chooses
 *  whether to match a specific judge's style (uploading 1-3 of their judgments) or a preferred
 *  application format (uploading a sample application), text is extracted client-side (the files
 *  themselves are never uploaded, same as every other document-extraction feature on this
 *  platform), and the resulting profile — structural preference only, never how a judge tends to
 *  rule — reorders (never rewrites) the draft's already-templated sections via
 *  src/lib/judgeStyle.ts:applyJudgeStyleToSections. Freely skippable: WizardShell's own "Continue
 *  →" has no per-step completion gate, so doing nothing here and moving on is already the natural
 *  behaviour. */
export function JudgeStyleStep({ profile, onProfileReady, onOpenPricing }: Props) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [sourceType, setSourceType] = useState<SourceType>('judgment');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [state, setState] = useState<'idle' | 'analyzing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copy = sourceTypeCopy(t, sourceType);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files).slice(0, 3));
    setError(null);
    setPaywall(false);
  };

  const handleAnalyze = async () => {
    if (!token || pendingFiles.length === 0) return;
    setState('analyzing');
    setError(null);
    setPaywall(false);
    try {
      const texts = await Promise.all(pendingFiles.map((file) => extractTextFromPdf(file)));
      const result = await analyzeJudgeStyleFromTexts(texts, token, sourceType);
      onProfileReady(result);
      setState('idle');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setError(t.wizardShared.judgeStyle.scannedError(copy.scannedErrorNoun));
      } else if (err instanceof ApiError && err.status === 402) {
        setPaywall(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t.wizardShared.judgeStyle.genericFileError);
      }
      setState('error');
    }
  };

  return (
    <div>
      <h3 className="step-heading">{t.wizardShared.judgeStyle.heading}</h3>
      <p className="step-help">{t.wizardShared.judgeStyle.help}</p>

      {!profile && (
        <div className="grounds-grid" style={{ marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className={sourceType === 'judgment' ? 'ground-card active' : 'ground-card'}
            onClick={() => {
              setSourceType('judgment');
              setPendingFiles([]);
              setError(null);
            }}
          >
            {t.wizardShared.judgeStyle.matchJudge}
          </button>
          <button
            type="button"
            className={sourceType === 'application' ? 'ground-card active' : 'ground-card'}
            onClick={() => {
              setSourceType('application');
              setPendingFiles([]);
              setError(null);
            }}
          >
            {t.wizardShared.judgeStyle.followApplication}
          </button>
        </div>
      )}

      <p className="step-help" style={{ marginTop: 'var(--space-3)' }}>
        {copy.helpText}
      </p>

      {profile ? (
        <div className="deadline-card" style={{ marginTop: 'var(--space-4)' }}>
          <p className="deadline-label">{copy.profileLabel}</p>
          <p className="deadline-body">{profile.summary || t.wizardShared.judgeStyle.noStylePattern}</p>
          <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
            {citationDensityLabel(t, profile.citationDensity)}
          </p>
          <button
            type="button"
            className="para-btn"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={() => {
              onProfileReady(null);
              setPendingFiles([]);
            }}
          >
            {t.wizardShared.judgeStyle.removeReupload}
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="file-input-hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />
          <button type="button" className="para-btn" onClick={() => fileInputRef.current?.click()} disabled={state === 'analyzing'}>
            {pendingFiles.length > 0 ? t.wizardShared.judgeStyle.filesSelected(pendingFiles.length) : copy.chooseFileLabel}
          </button>
          {pendingFiles.length > 0 && (
            <button
              type="button"
              className="auth-submit"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={handleAnalyze}
              disabled={state === 'analyzing'}
            >
              {state === 'analyzing' ? t.wizardShared.judgeStyle.analyzing : copy.analyzeLabel}
            </button>
          )}
          {error && <p className="cl-error">{error}</p>}
          {paywall && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <PaywallBlock
                onChoosePlan={onOpenPricing}
                label={t.wizardShared.judgeStyle.paywallLabel}
                body={t.wizardShared.judgeStyle.paywallBody}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
