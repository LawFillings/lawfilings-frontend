import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx';
import type { JSONContent } from '@tiptap/react';

const TWIPS_PER_MM = 56.6929;
const MARGIN_VERTICAL_TWIPS = Math.round(20 * TWIPS_PER_MM);

const PAGE_SIZE_TWIPS: Record<'legal' | 'a4' | 'letter', { width: number; height: number }> = {
  legal: { width: Math.round(8.5 * 1440), height: Math.round(14 * 1440) },
  letter: { width: Math.round(8.5 * 1440), height: Math.round(11 * 1440) },
  a4: { width: Math.round(210 * TWIPS_PER_MM), height: Math.round(297 * TWIPS_PER_MM) },
};

export interface ExportPrintSettings {
  pageSize: 'legal' | 'a4' | 'letter';
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// Legal-size filings conventionally run wider side margins than A4/Letter for binding/annotation
// space — matches the same per-page-size rule applied to PDF export and Print's @page margin.
function marginHorizontalTwips(pageSize: ExportPrintSettings['pageSize']): number {
  return Math.round((pageSize === 'legal' ? 30 : 20) * TWIPS_PER_MM);
}

// Word wants a plain font family name, not the CSS font-stack Print Setup stores (e.g.
// "'Times New Roman', Times, serif") — take the first entry and strip quotes.
function docxFontName(fontFamily: string): string {
  const first = fontFamily.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

const ALIGN_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

/**
 * Renders the editor's structured content as a real .docx file — same tree walk as
 * exportDraftAsPdf, so the two exports (and Print) agree on structure, alignment, and
 * printSettings — but handed to Word instead of flattened to a fixed-layout PDF. This gives the
 * user full control over page setup (paper actually loaded in their printer, margins, zoom) at
 * print time, which a generated PDF's fixed page size can't offer.
 *
 * `skipHeader` mirrors exportDraftAsPdf's — omit the synthetic title/subtitle block when the
 * document's own content already opens with a cause title (or notice/agreement header).
 */
export async function exportDraftAsDocx(
  title: string,
  subtitle: string,
  content: JSONContent,
  filename: string,
  printSettings: ExportPrintSettings,
  skipHeader = false
) {
  const fontName = docxFontName(printSettings.fontFamily);
  const fontSizeHalfPt = printSettings.fontSize * 2;
  const marginH = marginHorizontalTwips(printSettings.pageSize);
  const pageSize = PAGE_SIZE_TWIPS[printSettings.pageSize];
  const usableWidthTwips = pageSize.width - marginH * 2;
  const lineSpacing = Math.round(240 * printSettings.lineHeight);
  const NUMBER_INDENT_TWIPS = Math.round(8 * TWIPS_PER_MM);

  const run = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
    new TextRun({ text, font: fontName, size: opts.size ?? fontSizeHalfPt, bold: opts.bold });

  const children: (Paragraph | Table)[] = [];

  if (!skipHeader) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: lineSpacing, after: 80 },
        children: [run(title.toUpperCase(), { bold: true, size: fontSizeHalfPt + 4 })],
      })
    );
    if (subtitle) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: lineSpacing, after: 80 },
          children: [run(subtitle, { size: Math.max(fontSizeHalfPt - 2, 16) })],
        })
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } },
        children: [],
      })
    );
  }

  function paragraphFromText(
    text: string,
    align: 'left' | 'center' | 'right' | 'justify' = 'left',
    opts: { bold?: boolean } = {}
  ): Paragraph {
    return new Paragraph({
      alignment: ALIGN_MAP[align],
      spacing: { line: lineSpacing, after: 120 },
      children: [run(text, opts)],
    });
  }

  // Hanging indent for numbered pleading paragraphs — "1." sits at the margin, and every wrapped
  // line of the paragraph's own text (first line included) aligns under the text rather than
  // under the number, matching the same convention applied to PDF export and real filings.
  function numberedParagraph(counter: number, text: string): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: lineSpacing, after: 120 },
      indent: { left: NUMBER_INDENT_TWIPS, hanging: NUMBER_INDENT_TWIPS },
      tabStops: [{ type: TabStopType.LEFT, position: NUMBER_INDENT_TWIPS }],
      children: [run(`${counter}.\t${text}`)],
    });
  }

  // Cause-title party line (see partyBlock in legalDocumentFormat.ts) — name flush left, role
  // label flush right, same line, via a right tab stop at the usable-width edge.
  function partyLineParagraph(nameText: string, labelText: string): Paragraph {
    return new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: usableWidthTwips }],
      spacing: { line: lineSpacing, after: 120 },
      children: [run(`${nameText}\t${labelText}`)],
    });
  }

  function walk(nodes: JSONContent[]) {
    for (const node of nodes) {
      if (node.type === 'heading') {
        children.push(
          paragraphFromText(
            extractText(node),
            (node.attrs?.textAlign as 'left' | 'center' | 'right') ?? 'left',
            { bold: true }
          )
        );
      } else if (node.type === 'orderedList') {
        let counter = (node.attrs?.start as number | undefined) ?? 1;
        for (const item of node.content ?? []) {
          children.push(numberedParagraph(counter, extractText(item)));
          counter += 1;
        }
      } else if (node.type === 'bulletList') {
        for (const item of node.content ?? []) {
          children.push(
            new Paragraph({
              spacing: { line: lineSpacing, after: 120 },
              indent: { left: NUMBER_INDENT_TWIPS, hanging: NUMBER_INDENT_TWIPS },
              tabStops: [{ type: TabStopType.LEFT, position: NUMBER_INDENT_TWIPS }],
              children: [run(`•\t${extractText(item)}`)],
            })
          );
        }
      } else if (node.type === 'paragraph') {
        const text = extractText(node);
        if (!text.trim()) {
          children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
          continue;
        }
        children.push(
          paragraphFromText(text, (node.attrs?.textAlign as 'left' | 'center' | 'right' | 'justify') ?? 'left')
        );
      } else if (node.type === 'table') {
        const rows = node.content ?? [];
        const plainRows: JSONContent[] = [];
        for (const row of rows) {
          const nameCell = row.content?.find((c) => c.attrs?.partyRole === 'name');
          const labelCell = row.content?.find((c) => c.attrs?.partyRole === 'label');
          if (nameCell || labelCell) {
            children.push(partyLineParagraph(nameCell ? extractText(nameCell) : '', labelCell ? extractText(labelCell) : ''));
          } else {
            plainRows.push(row);
          }
        }
        // Any remaining rows are a plain inserted table — rendered as a real Word table rather
        // than joined text.
        if (plainRows.length > 0) {
          children.push(
            new Table({
              width: { size: usableWidthTwips, type: WidthType.DXA },
              rows: plainRows.map(
                (row) =>
                  new TableRow({
                    children: (row.content ?? []).map(
                      (cell) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              spacing: { line: lineSpacing },
                              children: [run(extractText(cell))],
                            }),
                          ],
                        })
                    ),
                  })
              ),
            })
          );
        }
      } else if (node.content) {
        walk(node.content);
      }
    }
  }

  walk(content.content ?? []);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: pageSize.width, height: pageSize.height },
            margin: { top: MARGIN_VERTICAL_TWIPS, bottom: MARGIN_VERTICAL_TWIPS, left: marginH, right: marginH },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
