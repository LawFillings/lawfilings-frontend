import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { analyzeJudgeStyleFromTexts, type JudgeStyleProfile } from '../lib/judgeStyleClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from './PaywallBlock';

interface Props {
  profile: JudgeStyleProfile | null;
  onProfileReady: (profile: JudgeStyleProfile | null) => void;
  onOpenPricing: () => void;
}

const CITATION_DENSITY_LABEL: Record<JudgeStyleProfile['citationDensity'], string> = {
  high: 'Cites precedent/statute heavily',
  low: 'Cites precedent/statute sparingly',
  neutral: 'No strong pattern found',
};

/** Optional, on-demand, paid-plan step every wizard can insert before Preview: the advocate
 *  uploads 1-3 judgments by a specific judge, text is extracted client-side (the files themselves
 *  are never uploaded, same as every other document-extraction feature on this platform), and the
 *  resulting style profile — writing/procedural style only, never how the judge tends to rule —
 *  reorders (never rewrites) the draft's already-templated sections via
 *  src/lib/judgeStyle.ts:applyJudgeStyleToSections. Freely skippable: WizardShell's own "Continue
 *  →" has no per-step completion gate, so doing nothing here and moving on is already the natural
 *  behaviour. */
export function JudgeStyleStep({ profile, onProfileReady, onOpenPricing }: Props) {
  const { token } = useAuth();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [state, setState] = useState<'idle' | 'analyzing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const result = await analyzeJudgeStyleFromTexts(texts, token);
      onProfileReady(result);
      setState('idle');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setError(
          'One of these looks like a scanned judgment — text extraction only works with text-based PDFs for now. Try a text-based copy (e.g. from the court/tribunal’s own website) instead.'
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setPaywall(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't read one of those files — please make sure they're PDFs and try again.");
      }
      setState('error');
    }
  };

  return (
    <div>
      <h3 className="step-heading">Judge style (optional)</h3>
      <p className="step-help">
        Optional — upload 1 to 3 judgments by the judge or bench this matter is likely to come before, and the draft's
        sections below will be reordered to match how that judge is used to reading one (facts before law, or law
        before facts). Nothing here rewrites the drafted text itself. Skip this step (click Continue) if you'd
        rather not, or don't know the bench yet.
      </p>

      {profile ? (
        <div className="deadline-card" style={{ marginTop: 'var(--space-4)' }}>
          <p className="deadline-label">Judge style profile applied</p>
          <p className="deadline-body">{profile.summary || 'No strong stylistic pattern found in the text provided.'}</p>
          <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
            {CITATION_DENSITY_LABEL[profile.citationDensity]}
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
            Remove and re-upload
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
            {pendingFiles.length > 0 ? `${pendingFiles.length} file(s) selected — choose again` : 'Choose judgment PDF(s)'}
          </button>
          {pendingFiles.length > 0 && (
            <button
              type="button"
              className="auth-submit"
              style={{ marginTop: 'var(--space-3)' }}
              onClick={handleAnalyze}
              disabled={state === 'analyzing'}
            >
              {state === 'analyzing' ? 'Analyzing…' : 'Analyze judge style'}
            </button>
          )}
          {error && <p className="cl-error">{error}</p>}
          {paywall && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <PaywallBlock
                onChoosePlan={onOpenPricing}
                label="Judge style analysis needs a paid plan"
                body="This is a paid-only feature, with no free allowance — subscribe to use it, or skip this step and continue with the standard draft."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
