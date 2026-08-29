import jsPDF from 'jspdf';
import type { JSONContent } from '@tiptap/react';

const MARGIN_VERTICAL = 20; // mm
// Legal-size filings conventionally run wider side margins than A4/Letter for binding/annotation
// space — matches the same per-page-size rule applied to Print's @page margin in DraftDocument.tsx.
function marginHorizontal(pageSize: ExportPrintSettings['pageSize']): number {
  return pageSize === 'legal' ? 30 : 20; // mm
}

export interface ExportPrintSettings {
  pageSize: 'legal' | 'a4' | 'letter';
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// jsPDF's built-in fonts are just these three — map the Print Setup font choices onto whichever
// is closest (Georgia has no serif equivalent bundled, so it falls back to times; Arial isn't
// bundled either, so it falls back to helvetica, which is visually closest).
function jsPdfFontName(fontFamily: string): string {
  const f = fontFamily.toLowerCase();
  if (f.includes('times') || f.includes('georgia')) return 'times';
  if (f.includes('courier')) return 'courier';
  return 'helvetica';
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

/**
 * Renders the editor's structured content (headings, numbered/bulleted lists, paragraph
 * alignment) rather than flattened plain text, and honours the same Print Setup the user
 * configured for the Print button — page size, font, font size, and line spacing — so "Download
 * PDF" and "Print" produce matching output instead of two different, independently-hardcoded
 * renderings.
 *
 * `skipHeader` mirrors DraftDocument's own on-screen/print behaviour: when the document's content
 * already opens with a cause title (or notice/agreement header) that restates the title itself,
 * the synthetic title/subtitle block below must be omitted — otherwise the exported PDF ends up
 * with the heading twice while Print (which just prints the DOM as rendered on screen) never did.
 */
export function exportDraftAsPdf(
  title: string,
  subtitle: string,
  content: JSONContent,
  filename: string,
  printSettings: ExportPrintSettings,
  skipHeader = false
) {
  const doc = new jsPDF({ unit: 'mm', format: printSettings.pageSize });
  const fontName = jsPdfFontName(printSettings.fontFamily);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginH = marginHorizontal(printSettings.pageSize);
  const usableWidth = pageWidth - marginH * 2;
  const bodyFontSize = printSettings.fontSize;
  // pt -> mm (1pt = 0.3528mm), scaled by the line-spacing multiplier exactly the way CSS
  // line-height does on screen/Print (line-height: 2 = 24pt leading for a 12pt font, i.e. genuine
  // double spacing) — matches --print-line-height in DraftDocument.css so the two paths agree.
  const lineGap = bodyFontSize * 0.3528 * printSettings.lineHeight;
  let y = MARGIN_VERTICAL;

  const ensureSpace = (linesNeeded: number) => {
    if (y + linesNeeded * lineGap > pageHeight - MARGIN_VERTICAL) {
      doc.addPage();
      y = MARGIN_VERTICAL;
    }
  };

  if (!skipHeader) {
    doc.setFont(fontName, 'bold');
    doc.setFontSize(bodyFontSize + 2);
    const titleLines = doc.splitTextToSize(title.toUpperCase(), usableWidth) as string[];
    ensureSpace(titleLines.length);
    doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
    y += titleLines.length * lineGap;

    if (subtitle) {
      doc.setFont(fontName, 'normal');
      doc.setFontSize(Math.max(bodyFontSize - 1, 8));
      const subtitleLines = doc.splitTextToSize(subtitle, usableWidth) as string[];
      ensureSpace(subtitleLines.length);
      doc.text(subtitleLines, pageWidth / 2, y, { align: 'center' });
      y += subtitleLines.length * lineGap;
    }

    y += lineGap * 0.5;
    doc.setDrawColor(150);
    doc.line(marginH, y, pageWidth - marginH, y);
    y += lineGap;
  }

  doc.setFont(fontName, 'normal');
  doc.setFontSize(bodyFontSize);
  // Forced explicitly rather than relying on jsPDF's default, so body text always prints pure
  // black regardless of any fill-color state left behind by the divider/other draw calls above.
  doc.setTextColor(0, 0, 0);

  // jsPDF's text() has no built-in justify, so a justified line is stretched by hand: split it
  // into words and pad each gap with the leftover width (natural width vs. the usable column
  // width) split evenly between them. The last line of a justified paragraph stays left-aligned,
  // matching normal typographic convention (and CSS text-align:justify's own default behaviour).
  function renderJustifiedLine(line: string, x: number, yPos: number, width: number) {
    const words = line.split(' ').filter(Boolean);
    if (words.length <= 1) {
      doc.text(line, x, yPos);
      return;
    }
    const extraSpace = width - doc.getTextWidth(line);
    const extraPerGap = extraSpace / (words.length - 1);
    const spaceWidth = doc.getTextWidth(' ');
    let cursorX = x;
    for (const word of words) {
      doc.text(word, cursorX, yPos);
      cursorX += doc.getTextWidth(word) + spaceWidth + extraPerGap;
    }
  }

  // Lines are rendered one at a time (rather than handing the whole wrapped array to a single
  // doc.text call) so every line advances by our own `lineGap` — which reflects the user's chosen
  // line spacing — instead of jsPDF's fixed internal line-height factor, and so a justified
  // paragraph's interior lines can be stretched independently of its last line.
  function renderBlock(text: string, align: 'left' | 'center' | 'right' | 'justify' = 'left') {
    if (!text.trim()) {
      y += lineGap * 0.5;
      return;
    }
    const lines = doc.splitTextToSize(text, usableWidth) as string[];
    ensureSpace(lines.length);
    lines.forEach((line, i) => {
      const isLastLine = i === lines.length - 1;
      if (align === 'justify' && !isLastLine) {
        renderJustifiedLine(line, marginH, y, usableWidth);
      } else if (align === 'center') {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
      } else if (align === 'right') {
        doc.text(line, pageWidth - marginH, y, { align: 'right' });
      } else {
        doc.text(line, marginH, y);
      }
      y += lineGap;
    });
  }

  // Hanging indent for numbered pleading paragraphs — "1." sits at the margin, and every wrapped
  // line of the paragraph's own text (first line included) aligns under the text rather than
  // under the number, matching the native <ol>/<li> rendering the on-screen/Print path already
  // gets for free from the browser, and the numbered-clause convention shown in real filings.
  const NUMBER_INDENT = 8; // mm — comfortably fits "1." through "99." without crowding the text
  function renderNumberedItem(counter: number, text: string) {
    const indentedWidth = usableWidth - NUMBER_INDENT;
    const lines = doc.splitTextToSize(text, indentedWidth) as string[];
    ensureSpace(lines.length);
    doc.text(`${counter}.`, marginH, y);
    lines.forEach((line, i) => {
      const isLastLine = i === lines.length - 1;
      if (isLastLine) {
        doc.text(line, marginH + NUMBER_INDENT, y);
      } else {
        renderJustifiedLine(line, marginH + NUMBER_INDENT, y, indentedWidth);
      }
      y += lineGap;
    });
  }

  function walk(nodes: JSONContent[]) {
    for (const node of nodes) {
      if (node.type === 'heading') {
        y += lineGap * 0.5;
        doc.setFont(fontName, 'bold');
        renderBlock(extractText(node), (node.attrs?.textAlign as 'left' | 'center' | 'right') ?? 'left');
        doc.setFont(fontName, 'normal');
        y += lineGap * 0.3;
      } else if (node.type === 'orderedList') {
        let counter = (node.attrs?.start as number | undefined) ?? 1;
        for (const item of node.content ?? []) {
          renderNumberedItem(counter, extractText(item));
          counter += 1;
        }
      } else if (node.type === 'bulletList') {
        for (const item of node.content ?? []) {
          renderBlock(`•  ${extractText(item)}`);
        }
      } else if (node.type === 'paragraph') {
        renderBlock(extractText(node), (node.attrs?.textAlign as 'left' | 'center' | 'right' | 'justify') ?? 'left');
        y += lineGap * 0.3;
      } else if (node.type === 'table') {
        for (const row of node.content ?? []) {
          const cells = row.content ?? [];
          const nameCell = cells.find((c) => c.attrs?.partyRole === 'name');
          const labelCell = cells.find((c) => c.attrs?.partyRole === 'label');
          if (nameCell || labelCell) {
            // Cause-title party line (see partyBlock in legalDocumentFormat.ts) — name flush left,
            // label flush right, same line, matching the on-screen/print CSS layout instead of the
            // generic table fallback below, which would otherwise cram both onto the left margin.
            ensureSpace(1);
            const nameText = nameCell ? extractText(nameCell) : '';
            const labelText = labelCell ? extractText(labelCell) : '';
            if (nameText) doc.text(nameText, marginH, y);
            if (labelText) doc.text(labelText, pageWidth - marginH, y, { align: 'right' });
            y += lineGap;
            continue;
          }
          // Best-effort fallback for a plain inserted table — jsPDF has no table layout primitive
          // here, so each row's cells are joined onto one line rather than dropped entirely.
          const cellTexts = cells.map(extractText).filter((c) => c.trim());
          if (cellTexts.length) renderBlock(cellTexts.join('    '));
        }
        y += lineGap * 0.3;
      } else if (node.content) {
        walk(node.content);
      }
    }
  }

  walk(content.content ?? []);

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
