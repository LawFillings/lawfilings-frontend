import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/apiError';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { extractFieldsFromText } from '../lib/documentExtractionClient';

export interface AutofillField {
  key: string;
  label: string;
  /** Extra guidance for reading this field out of the document (e.g. "the drawer, not the payee"). */
  hint?: string;
  /** How the wizard stores the value: 'date' fields must be YYYY-MM-DD (native date inputs),
   *  'amount' fields are plain digits. Defaults to free text. */
  kind?: 'text' | 'date' | 'amount';
  /** The wizard's current value — only a blank field is ever filled. */
  value: string;
  set: (value: string) => void;
}

interface Props {
  /** What the user is uploading, in plain words: "cheque return memo", "loan agreement", … */
  documentLabel: string;
  fields: AutofillField[];
  /** Overrides the button text; defaults to "Fill from <documentLabel> (PDF)". */
  buttonLabel?: string;
}

/**
 * "Upload a document to fill in the blanks" for any wizard. The PDF's text is read in the browser
 * (the file itself never leaves it); only that text goes to the server, which returns the fields
 * this wizard asked for. Never overwrites anything the user has already typed.
 */
export function DocumentAutofill({ documentLabel, fields, buttonLabel }: Props) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  // The extraction is asynchronous; read the latest field values when it finishes, not the ones
  // captured when the file was picked.
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const [state, setState] = useState<'idle' | 'reading' | 'done' | 'error'>('idle');
  const [filledCount, setFilledCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!token) return;
    setState('reading');
    setError(null);
    try {
      const text = await extractTextFromPdf(file);
      const values = await extractFieldsFromText(
        text,
        documentLabel,
        fields.map(({ key, label, hint, kind }) => ({
          key,
          label,
          hint:
            kind === 'date'
              ? `${hint ?? ''} Return as YYYY-MM-DD.`.trim()
              : kind === 'amount'
                ? `${hint ?? ''} Digits only, no commas or currency symbols.`.trim()
                : hint,
        })),
        token
      );
      let filled = 0;
      for (const f of fieldsRef.current) {
        let extracted = (values[f.key] ?? '').trim();
        if (f.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(extracted)) extracted = '';
        if (f.kind === 'amount') extracted = extracted.replace(/[^\d.]/g, '');
        if (extracted && !f.value.trim()) {
          f.set(extracted);
          filled++;
        }
      }
      setFilledCount(filled);
      setState('done');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setError(
          `This looks like a scanned ${documentLabel} — reading only works with text-based PDFs for now. Try running it through a free online OCR/text-conversion tool and re-uploading the result, or fill in the details below manually.`
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setError('This feature needs an active plan — see Pricing, or fill in the details below manually.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't read that file — please make sure it's a PDF and try again.");
      }
      setState('error');
    }
  };

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="file-input-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleFile(file);
        }}
      />
      <button type="button" className="para-btn" onClick={() => inputRef.current?.click()} disabled={state === 'reading'}>
        {state === 'reading' ? `Reading ${documentLabel}…` : buttonLabel ?? `Fill from ${documentLabel} (PDF)`}
      </button>
      <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
        Only text-based PDFs are supported for now, not scanned copies. This fills in blank fields below from the{' '}
        {documentLabel} — review everything before continuing.
      </p>
      {state === 'done' && (
        <p className="step-help" style={{ color: 'var(--status-safe-text)', margin: 'var(--space-1) 0 0' }}>
          {filledCount > 0
            ? `Filled in ${filledCount} field${filledCount === 1 ? '' : 's'} from the ${documentLabel} — please check them before continuing.`
            : `Nothing new to fill in — either the blank fields weren't found in the ${documentLabel}, or they are already filled.`}
        </p>
      )}
      {state === 'error' && error && (
        <p className="step-help" style={{ color: 'var(--status-danger-text)', margin: 'var(--space-1) 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
