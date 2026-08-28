import { useEditor, EditorContent } from '@tiptap/react';
import { useId, useState, type CSSProperties } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { exportPlainTextAsPdf } from '../lib/exportPdf';
import './DraftDocument.css';

// Adds a data-party-role attribute so the borderless name/label cells used by the cause-title
// party lines (see legalDocumentFormat.ts's partyBlock) survive TipTap's parse — plain inline
// styles on <td> get stripped since TableCell's schema doesn't preserve arbitrary style props.
const PartyLineTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      partyRole: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-party-role'),
        renderHTML: (attributes: { partyRole?: string | null }) => {
          if (!attributes.partyRole) return {};
          return {
            'data-party-role': attributes.partyRole,
            class: `party-cell party-cell-${attributes.partyRole}`,
          };
        },
      },
    };
  },
});

export interface DraftSection {
  heading?: string;
  paragraphs: string[];
  /** Marks a paragraph range as filled from a clause the user didn't fully complete */
  incomplete?: boolean;
  /** Renders as plain paragraphs outside the running numbered list — for blocks like Verification
   *  that are conventionally unnumbered in real filings. */
  unnumbered?: boolean;
  /** Aligns an unnumbered section's paragraphs — 'center' for party-name lines (e.g. Memo of
   *  Parties) that repeat the cause title's centered layout; 'right' for closing signature blocks
   *  (Filed by / Deponent lines), which real filings place flush against the right margin; 'left'
   *  for plain unstyled text (e.g. a "To: The Registrar…" addressee block), skipping the justify
   *  that's the default for numbered body paragraphs. */
  align?: 'left' | 'center' | 'right';
  /** Centers just the section heading (e.g. "Verification") without affecting its body
   *  paragraphs, which stay left-aligned running prose. */
  headingAlign?: 'center';
}

interface DraftDocumentProps {
  title: string;
  subtitle?: string;
  sections: DraftSection[];
  /** Full cause-title block HTML (see legalDocumentFormat.ts's buildCauseTitleHtml) prepended
   *  into the editable content. When provided, this replaces the plain static title/subtitle
   *  header, since the cause title already includes the application title. */
  causeTitleHtml?: string;
}

interface PrintSettings {
  pageSize: 'legal' | 'a4' | 'letter';
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: 'legal',
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: 12,
  lineHeight: 2,
};

const PAGE_SIZE_OPTIONS: { value: PrintSettings['pageSize']; label: string }[] = [
  { value: 'legal', label: 'Legal (8.5 × 14 in)' },
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
];

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 16];

const LINE_SPACING_OPTIONS: { value: number; label: string }[] = [
  { value: 1.15, label: 'Single' },
  { value: 1.5, label: '1.5 lines' },
  { value: 2, label: 'Double' },
];

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Numbered paragraphs run continuously across sections (matching the platform's drafting
// convention), so each section's <ol> picks up where the previous one left off via `start`.
// Sections marked `unnumbered` (e.g. Verification) render as plain paragraphs instead and don't
// advance the counter, matching how those blocks appear — unnumbered — in real filings.
function buildInitialContent(sections: DraftSection[], causeTitleHtml?: string): string {
  let counter = 0;
  const body = sections
    .map((section) => {
      if (section.unnumbered) {
        const headingStyle = section.headingAlign ? ` style="text-align:${section.headingAlign};"` : '';
        const heading = section.heading ? `<h3${headingStyle}>${escapeHtml(section.heading)}</h3>` : '';
        // Default (no align override): justified body text, matching the real filing convention
        // for numbered paragraphs like "2.1 Name of the Defendant…" — every line, wrapped or not,
        // stays flush at the same left margin as the paragraph number and the heading above it,
        // no hanging indent. 'left' is a plain, unstyled paragraph — for short blocks (e.g. a
        // "To: The Registrar…" address) where the justify treatment would look wrong.
        const p =
          section.align === 'left'
            ? (text: string) => `<p>${escapeHtml(text)}</p>`
            : section.align
              ? (text: string) => `<p style="text-align:${section.align};">${escapeHtml(text)}</p>`
              : (text: string) => `<p style="text-align:justify;">${escapeHtml(text)}</p>`;
        const paras = section.paragraphs.map(p).join('');
        return heading + paras;
      }
      const heading = section.heading ? `<h3>${escapeHtml(section.heading)}</h3>` : '';
      const start = counter + 1;
      const items = section.paragraphs
        .map((p) => {
          counter += 1;
          return `<li><p>${escapeHtml(p)}</p></li>`;
        })
        .join('');
      return heading + (items ? `<ol start="${start}">${items}</ol>` : '');
    })
    .join('');
  return (causeTitleHtml ?? '') + body;
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  label: string;
  title: string;
}

function ToolbarButton({ active, onClick, label, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'draft-doc-toolbtn active' : 'draft-doc-toolbtn'}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function DraftDocument({ title, subtitle, sections, causeTitleHtml }: DraftDocumentProps) {
  const hasIncomplete = sections.some((s) => s.incomplete);
  const printRootId = `draft-doc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [showPrintSetup, setShowPrintSetup] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        PartyLineTableCell,
      ],
      content: buildInitialContent(sections, causeTitleHtml),
      // Toolbar buttons show active/pressed state (e.g. which alignment applies at the cursor) —
      // that requires a re-render on every selection change, not just document edits, since v3
      // defaults this to false for performance.
      shouldRerenderOnTransaction: true,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const handleExport = () => {
    const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const bodyText = editor.getText({ blockSeparator: '\n\n' });
    exportPlainTextAsPdf(title, subtitle ?? '', bodyText, filename);
  };

  // Only this document (identified by printRootId) should end up on paper, even when a wizard
  // renders several DraftDocument instances on the same page (e.g. Index/Application/Affidavit).
  // The browser's own "paper size" dropdown still overrides the @page size suggestion below on
  // some browsers/printers — this sets the default, not a hard guarantee.
  const handlePrint = () => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @page { size: ${printSettings.pageSize}; margin: 1in; }
      @media print {
        body * { visibility: hidden; }
        #${printRootId}, #${printRootId} * { visibility: visible; }
        #${printRootId} { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(styleEl);
    const cleanup = () => {
      styleEl.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <div id={printRootId}>
      <div className="draft-doc-toolbar">
        <button className="para-btn" onClick={handleExport}>
          Download PDF
        </button>
        <button className="para-btn" onClick={handlePrint}>
          Print
        </button>
        <button className="para-btn" onClick={() => setShowPrintSetup((s) => !s)} aria-expanded={showPrintSetup}>
          Print Setup
        </button>
        {hasIncomplete && (
          <span className="draft-doc-toolbar-note">
            Some sections are still incomplete — edit the text below before exporting.
          </span>
        )}
      </div>

      {showPrintSetup && (
        <div className="draft-doc-print-setup-panel">
          <label className="draft-doc-print-setup-field">
            <span>Page size</span>
            <select
              value={printSettings.pageSize}
              onChange={(e) => setPrintSettings((s) => ({ ...s, pageSize: e.target.value as PrintSettings['pageSize'] }))}
            >
              {PAGE_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="draft-doc-print-setup-field">
            <span>Font</span>
            <select
              value={printSettings.fontFamily}
              onChange={(e) => setPrintSettings((s) => ({ ...s, fontFamily: e.target.value }))}
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="draft-doc-print-setup-field">
            <span>Font size</span>
            <select
              value={printSettings.fontSize}
              onChange={(e) => setPrintSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
            >
              {FONT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} pt
                </option>
              ))}
            </select>
          </label>
          <label className="draft-doc-print-setup-field">
            <span>Line spacing</span>
            <select
              value={printSettings.lineHeight}
              onChange={(e) => setPrintSettings((s) => ({ ...s, lineHeight: Number(e.target.value) }))}
            >
              {LINE_SPACING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="draft-doc-edit-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton
          label="B"
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="I"
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="U"
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="S"
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <span className="draft-doc-edit-toolbar-sep" />
        <ToolbarButton
          label="H"
          title="Heading"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="•—"
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1—"
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="❝"
          title="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <span className="draft-doc-edit-toolbar-sep" />
        <ToolbarButton
          label="⟵"
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          label="↔"
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          label="⟶"
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
        <ToolbarButton
          label="≡"
          title="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        />
        <span className="draft-doc-edit-toolbar-sep" />
        <ToolbarButton
          label="⊞"
          title="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        <span className="draft-doc-edit-toolbar-sep" />
        <ToolbarButton label="↺" title="Undo" onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton label="↻" title="Redo" onClick={() => editor.chain().focus().redo().run()} />
      </div>

      <div
        className="draft-doc"
        style={
          {
            '--print-font-family': printSettings.fontFamily,
            '--print-font-size': `${printSettings.fontSize}pt`,
            '--print-line-height': printSettings.lineHeight,
          } as CSSProperties
        }
      >
        {!causeTitleHtml && (
          <div className="draft-doc-header">
            <p className="draft-doc-title">{title}</p>
            {subtitle && <p className="draft-doc-subtitle">{subtitle}</p>}
          </div>
        )}
        <EditorContent editor={editor} className="draft-doc-body" />
      </div>
    </div>
  );
}
