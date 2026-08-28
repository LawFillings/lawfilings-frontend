import jsPDF from 'jspdf';

const PAGE_MARGIN = 20;
const LINE_HEIGHT = 6;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_TITLE = 13;

// Takes the editor's current plain text (post-edit), since the draft body is now a free-form
// rich-text area rather than a fixed heading/paragraph structure — formatting like bold/italic/
// tables isn't preserved here, only line breaks between blocks.
export function exportPlainTextAsPdf(title: string, subtitle: string, bodyText: string, filename: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureSpace = (linesNeeded: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + linesNeeded * LINE_HEIGHT > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE_TITLE);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), usableWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += titleLines.length * LINE_HEIGHT;

  if (subtitle) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const subtitleLines = doc.splitTextToSize(subtitle, usableWidth);
    doc.text(subtitleLines, pageWidth / 2, y, { align: 'center' });
    y += subtitleLines.length * LINE_HEIGHT;
  }

  y += LINE_HEIGHT;
  doc.setDrawColor(150);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += LINE_HEIGHT * 1.5;

  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_SIZE_BODY);

  const blocks = bodyText.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  for (const block of blocks) {
    const lines = doc.splitTextToSize(block, usableWidth);
    ensureSpace(lines.length + 1);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * LINE_HEIGHT + LINE_HEIGHT * 0.5;
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
