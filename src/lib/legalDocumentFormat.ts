// Shared helpers so every wizard's DraftDocument output follows the same real-world filing
// convention we catalogued from actual DRT sample filings: a proper cause title (BEFORE THE
// TRIBUNAL / IN THE MATTER OF / VERSUS), a "MOST RESPECTFULLY SHOWETH:" opening, and a closing
// Verification block — not just topically-headed prose with no structural wrapper.

// Deliberately not importing DraftSection from '../components/DraftDocument' to avoid a
// circular import; this shape is structurally compatible with it.
interface LegalDraftSection {
  heading?: string;
  paragraphs: string[];
  incomplete?: boolean;
  unnumbered?: boolean;
  align?: 'left' | 'center' | 'right';
  headingAlign?: 'center';
}

export function forumDisplayName(forumType: string): string {
  switch (forumType) {
    case 'DRT':
      return "THE DEBTS RECOVERY TRIBUNAL";
    case 'DRAT':
      return "THE DEBTS RECOVERY APPELLATE TRIBUNAL";
    case 'NCLT':
      return 'THE NATIONAL COMPANY LAW TRIBUNAL';
    case 'NCLAT':
      return 'THE NATIONAL COMPANY LAW APPELLATE TRIBUNAL';
    case 'consumer_commission':
      return 'THE CONSUMER DISPUTES REDRESSAL COMMISSION';
    case 'district_court':
      return 'THE COURT OF THE DISTRICT JUDGE';
    case 'commercial_court':
      return 'THE COMMERCIAL COURT';
    case 'magistrate_court':
      return 'THE COURT OF THE MAGISTRATE';
    case 'sessions_court':
      return 'THE COURT OF THE SESSIONS JUDGE';
    case 'high_court':
      return 'THE HIGH COURT';
    case 'mediation_authority':
      return 'THE PRESIDING OFFICER-CUM-CHAIRMAN, DISTRICT LEGAL SERVICES AUTHORITY';
    default:
      return "THE HON'BLE TRIBUNAL";
  }
}

/** "Tribunal" / "Commission" / "Court" — used inline in the Prayer clause's "this Hon'ble ___". */
export function forumNoun(forumType: string): string {
  if (forumType === 'consumer_commission') return 'Commission';
  if (forumType === 'mediation_authority') return 'Authority';
  if (
    forumType === 'district_court' ||
    forumType === 'commercial_court' ||
    forumType === 'magistrate_court' ||
    forumType === 'sessions_court' ||
    forumType === 'high_court'
  ) {
    return 'Court';
  }
  return 'Tribunal';
}

export function partyLabels(forumType: string, filingCategory?: string): { applicant: string; respondent: string } {
  if (filingCategory === 'appeal') return { applicant: 'APPELLANT', respondent: 'RESPONDENT' };
  if (forumType === 'consumer_commission') return { applicant: 'COMPLAINANT', respondent: 'OPPOSITE PARTY' };
  if (forumType === 'district_court' || forumType === 'commercial_court') return { applicant: 'PLAINTIFF', respondent: 'DEFENDANT' };
  return { applicant: 'APPLICANT', respondent: 'RESPONDENT' };
}

export interface CauseTitleInfo {
  forumType: string;
  applicationTitle: string;
  governingLaw?: string;
  applicantName: string;
  respondentName: string;
  /**
   * When there's more than one opposing party, pass each of their names here — each renders on
   * its own centered line, numbered "1.", "2." etc., instead of the single respondentName line.
   * respondentName still drives the party-label logic (partyLabels/anyOppositePartyIsInstitution)
   * upstream — this only changes what's *displayed*.
   */
  respondentEntries?: string[];
  /**
   * Overrides the "[TITLE] NO. _____ OF [year]" case-number line entirely — e.g. an SA's real
   * convention is the abbreviated "S.A. No. _____/2024" rather than the OA's spelled-out
   * "ORIGINAL APPLICATION NO. _____ OF 2026". Pass the exact line text (unescaped, since it's
   * inserted the same way applicationTitle is); omit for the default spelled-out form.
   */
  caseNumberLine?: string;
  /** e.g. "I", "II", "III" — for cities with more than one DRT bench, appended to the forum line. */
  benchNumber?: string;
  /** e.g. "New Delhi" — the bench's city, shown on its own line under the forum name. */
  benchCity?: string;
  filingCategory?: string;
  parentCaseLabel?: string;
  parentCaseNumber?: string;
  /**
   * Real filings are often a bundle of separate documents (Index, Memo of Parties, the main
   * Application, a supporting Affidavit, List of Documents) that each restate the same cause
   * title but move straight to their own heading — only the main Application gets the full
   * "[TITLE] — UNDER [LAW]" line followed by "MOST RESPECTFULLY SHOWETH:". Pass a plain heading
   * (e.g. "MEMO OF PARTIES") to render that instead; omit for the default Application behaviour.
   */
  bodyHeading?: string;
  /**
   * Overrides the forumType/filingCategory-derived party label — e.g. Original Applications are
   * conventionally "Applicant" v. "Defendant", not the generic DRT default of "Respondent",
   * matching how the rest of the document refers to the opposing party.
   */
  applicantLabel?: string;
  respondentLabel?: string;
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Appends a period unless the text already ends with sentence punctuation — company/bank
 *  names commonly end in "Ltd." or "Pvt. Ltd.", so a blindly-appended period doubles up. */
export function withPeriod(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Prefixes a pleading paragraph with "That " — the standard opening for numbered averments in
 *  applications before Indian courts/tribunals (e.g. "That the Applicant has been cooperating
 *  with the investigation"). Idempotent — won't double up if the text already starts with "That".
 *  Lowercases the sentence's own leading word first when it's one of the common sentence-starters
 *  ("The Applicant..." -> "that the Applicant...") so the joined sentence reads naturally; any
 *  other leading word (a name, an acronym, a number) is left exactly as written, since guessing at
 *  its capitalisation risks mangling a proper noun. Not for the Prayer, party-title, or signature
 *  blocks, which conventionally don't take a "That" prefix. */
export function toThatClause(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const withoutPrefix = t.replace(/^that\s+/i, '');
  const lowerStarters = /^(The|This|It|A|An|His|Her|Their|There|They|Bail|No|In|Without)\b/;
  const adjusted = lowerStarters.test(withoutPrefix)
    ? withoutPrefix.charAt(0).toLowerCase() + withoutPrefix.slice(1)
    : withoutPrefix;
  return `That ${adjusted}`;
}

/**
 * Renders the standard cause-title block as an HTML fragment, meant to be prepended into
 * DraftDocument's editable content — matching an actual filed, notarised DRT OA we were shown
 * as reference: BEFORE THE HON'BLE [FORUM]-[BENCH], / [CITY] / [TITLE] NO. ___ OF [YEAR] / IN
 * THE MATTER OF: / [Applicant name] on the left, "…APPLICANT" label right-aligned on the SAME
 * line (no paragraph break between them) / VERSUS (centered) / same one-line pattern per
 * opposing party / [body heading] / MOST RESPECTFULLY SHOWETH: (main Application only; other
 * bundle parts get their own heading).
 */
export function partyBlock(name: string, label: string, numberPrefix: string): string {
  // Name left, label right, same line, no paragraph break between them. A borderless 2-column
  // table row (not a flex/justify <p>) because plain inline styles on <p>/<td> get stripped by
  // TipTap's TextAlign/Table extensions on parse. data-party-role survives because it's a custom
  // attribute PartyLineTableCell (DraftDocument.tsx) explicitly defines on the schema; its CSS
  // lives in DraftDocument.css under .party-cell.
  return (
    `<table><tbody><tr>` +
    `<td data-party-role="name">${numberPrefix}${escapeHtml(name)}</td>` +
    `<td data-party-role="label">…${escapeHtml(label)}</td>` +
    `</tr></tbody></table>`
  );
}

export function buildCauseTitleHtml(info: CauseTitleInfo): string {
  const defaultLabels = partyLabels(info.forumType, info.filingCategory);
  const labels = {
    applicant: info.applicantLabel ?? defaultLabels.applicant,
    respondent: info.respondentLabel ?? defaultLabels.respondent,
  };
  const year = new Date().getFullYear();
  const parentBlock = info.parentCaseNumber
    ? `<p style="text-align:center;">IN</p><p style="text-align:center;">${escapeHtml(info.parentCaseLabel ?? 'CASE')} NO. ${escapeHtml(
        info.parentCaseNumber
      )}</p>`
    : '';
  const forumName = forumDisplayName(info.forumType).replace(/^THE\s+/, '');
  const forumLine = info.benchNumber ? `${forumName}-${info.benchNumber}` : forumName;

  const respondentNames = info.respondentEntries && info.respondentEntries.length > 0 ? info.respondentEntries : [info.respondentName];
  const respondentBlocks = respondentNames
    .map((name, i) => partyBlock(name || '[Respondent]', labels.respondent, respondentNames.length > 1 ? `${i + 1}. ` : ''))
    .join('');

  return (
    `<p style="text-align:center;"><strong>BEFORE THE HON'BLE ${escapeHtml(forumLine)},</strong></p>` +
    (info.benchCity ? `<p style="text-align:center;"><strong>${escapeHtml(info.benchCity.toUpperCase())}</strong></p>` : '') +
    `<p style="text-align:center;">${escapeHtml(info.caseNumberLine ?? `${info.applicationTitle.toUpperCase()} NO. _____ OF ${year}`)}</p>` +
    parentBlock +
    `<p><strong>IN THE MATTER OF:</strong></p>` +
    partyBlock(info.applicantName || '[Applicant]', labels.applicant, '') +
    `<p style="text-align:center;">VERSUS</p>` +
    respondentBlocks +
    (info.bodyHeading !== undefined
      ? `<p style="text-align:center;"><strong><u>${escapeHtml(info.bodyHeading)}</u></strong></p>`
      : `<h3 style="text-align:center;">${escapeHtml(info.applicationTitle.toUpperCase())}${
          info.governingLaw ? ` — UNDER ${escapeHtml(info.governingLaw.toUpperCase())}` : ''
        }</h3>` + `<p><strong>MOST RESPECTFULLY SHOWETH:</strong></p>`)
  );
}

/** Detects "Bank" vs. a broader "Financial Institution" from the applicant's name, since Original
 *  Applications conventionally label the applicant "APPLICANT BANK" or "APPLICANT FI" rather than
 *  a bare "APPLICANT". A name-based heuristic, not a model call — the distinction only turns on
 *  whether "bank" appears in the entity's own name, which a keyword check settles instantly and
 *  deterministically without the latency/cost of an LLM round trip for something this mechanical. */
export function guessApplicantEntityLabel(applicantName: string): 'APPLICANT BANK' | 'APPLICANT FI' {
  return /\bbank\b/i.test(applicantName) ? 'APPLICANT BANK' : 'APPLICANT FI';
}

/** Document-wide: if every opposite party is an individual, all are "Defendants" throughout;
 *  if any one is an institution/company, all — individuals included — are "Respondents"
 *  throughout instead, rather than mixing terms within the same filing. */
export function anyOppositePartyIsInstitution(entries: { type: 'individual' | 'institution' }[]): boolean {
  return entries.some((e) => e.type === 'institution');
}

/** Splits free text typed into a wizard textarea into separate pleading paragraphs on blank lines. */
export function splitIntoParagraphs(freeText: string): string[] {
  const trimmed = freeText.trim();
  if (!trimmed) return [];
  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return blocks.length > 0 ? blocks : [trimmed.replace(/\s+/g, ' ')];
}

export function buildPrayerSection(reliefSought: string, forumType: string): LegalDraftSection {
  const noun = forumNoun(forumType);
  const relief = reliefSought.trim() || '[grant the relief sought]';
  return {
    heading: 'Prayer',
    paragraphs: [
      `In view of the facts and circumstances stated hereinabove, it is most respectfully prayed that this Hon'ble ${noun} may be pleased to ${relief}, and pass any other order(s) as this Hon'ble ${noun} may deem fit and proper in the interest of justice.`,
    ],
    incomplete: !reliefSought.trim(),
  };
}

/** The "FILED BY: [Applicant] (APPLICANT) THROUGH [Advocate]..." block shared across a bundled
 *  filing's parts. Returns three sections so "THROUGH" — the transitional word between the party
 *  and their advocate — can be centered while the lines around it stay right-aligned, matching
 *  real filings. `applicantLines` is the party-identity block above "THROUGH" as-is (e.g.
 *  `['Yes Bank Limited', '(APPLICANT)']` for an OA, or `['Securitisation Applicant', 'Smt Nibha
 *  Jha', 'w/o Sh. Vinay Kumar Jha']` for an SA, whose real convention leads with the role label
 *  rather than following the name with it) — different filing types order/word this differently
 *  enough that forcing one fixed shape here would fight the real documents instead of matching
 *  them. `heading` defaults to 'Filed by'; pass `null` to omit it (some real filings, like SA,
 *  don't label this block at all). */
export function buildFiledByBlock(params: {
  applicantLines: string[];
  heading?: string | null;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  place: string;
  date: string;
}): LegalDraftSection[] {
  const heading = params.heading === undefined ? 'Filed by' : params.heading;
  return [
    {
      ...(heading ? { heading } : {}),
      unnumbered: true,
      align: 'right',
      paragraphs: params.applicantLines,
    },
    { unnumbered: true, align: 'center', paragraphs: ['THROUGH'] },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: [
        params.advocateName || '[Name of Advocate]',
        `Address: ${params.advocateAddress || '[Address of Advocate]'}`,
        `Phone No.: ${params.advocatePhone || '[Phone No. of Advocate]'}`,
        `Email: ${params.advocateEmail || '[Email of Advocate]'}`,
        `Place: ${params.place || '[Place of filing]'}`,
        `Date: ${params.date || '[Date of filing]'}`,
      ],
    },
  ];
}

/** Renders the user's Index/List-of-Documents entries as numbered lines — see DrtOaWizard's
 *  Documents step, where these are collected via an add/remove row form rather than left as
 *  bracket placeholders for the user to hand-edit. */
export function buildDocumentListParagraphs(entries: { particulars: string; pageNo: string }[]): string[] {
  if (entries.length === 0) return ['No documents added yet — add them in the Documents step.'];
  return entries.map((e, i) => `${i + 1}. ${e.particulars || '[Particulars]'} — Page ${e.pageNo || '[to be filled in]'}`);
}

export interface NoticeLetterInfo {
  /** The advocate/firm sending the notice, or the claimant themselves if unrepresented. */
  senderName: string;
  senderAddress: string;
  senderPhone?: string;
  senderEmail?: string;
  date: string;
  recipientName: string;
  recipientAddress: string;
  subject: string;
  /** Present only when sent by an advocate "under instructions from" a client — omit for a
   *  self-represented notice, which speaks in the claimant's own voice instead. */
  clientName?: string;
  clientAddress?: string;
}

/** Renders a legal notice's letter header as an HTML fragment — sender block, date, addressee,
 *  subject line, and opening salutation/instructions line — meant to be passed into
 *  DraftDocument's `causeTitleHtml` prop exactly like buildCauseTitleHtml's output, even though a
 *  notice has no forum, cause title, or "MOST RESPECTFULLY SHOWETH:" — it's a letter, not a
 *  filing. The numbered body paragraphs (facts/demand) that follow are ordinary DraftSections,
 *  same as any other wizard. */
export function buildNoticeLetterHtml(info: NoticeLetterInfo): string {
  const senderLines = [
    escapeHtml(info.senderName || '[Sender Name]'),
    escapeHtml(info.senderAddress || '[Sender Address]'),
    info.senderPhone ? `Phone: ${escapeHtml(info.senderPhone)}` : '',
    info.senderEmail ? `Email: ${escapeHtml(info.senderEmail)}` : '',
  ]
    .filter(Boolean)
    .map((line) => `<p style="text-align:right;">${line}</p>`)
    .join('');

  const openingLine = info.clientName
    ? `Under instructions from and on behalf of my client, ${escapeHtml(info.clientName)}${
        info.clientAddress ? `, ${escapeHtml(info.clientAddress)}` : ''
      } (hereinafter referred to as "my Client"), I do hereby serve upon you the following legal notice:`
    : `I do hereby serve upon you the following legal notice:`;

  return (
    senderLines +
    `<p style="text-align:right;">Date: ${escapeHtml(info.date) || '[Date]'}</p>` +
    `<p><strong>To,</strong></p>` +
    `<p>${escapeHtml(info.recipientName) || '[Recipient Name]'}</p>` +
    `<p>${escapeHtml(info.recipientAddress) || '[Recipient Address]'}</p>` +
    `<p><strong>Subject: ${escapeHtml(info.subject) || '[Subject]'}</strong></p>` +
    `<p>Dear Sir/Madam,</p>` +
    `<p>${openingLine}</p>`
  );
}

export interface AgreementInfo {
  /** e.g. "RENT AGREEMENT", "LOAN AGREEMENT", "EMPLOYMENT AGREEMENT" — printed as the centered
   *  document title, taking the place a cause title's forum/application-title line would occupy. */
  title: string;
  date: string;
  place: string;
  partyARole: string;
  partyAName: string;
  partyAAddress: string;
  partyBRole: string;
  partyBName: string;
  partyBAddress: string;
  /** WHEREAS recital paragraphs — the background/purpose, before the operative clauses begin. */
  recitals: string[];
}

/** Renders a private contract's deed-style opening as an HTML fragment — title, date/place,
 *  BETWEEN/AND party recitals, and numbered WHEREAS clauses — meant for DraftDocument's
 *  `causeTitleHtml` prop exactly like buildCauseTitleHtml/buildNoticeLetterHtml's output, even
 *  though an agreement has no forum, cause title, or court to address: it's a deed between two
 *  private parties, not a filing. The numbered operative clauses that follow (term, consideration,
 *  termination, etc.) are ordinary DraftSections, same as any other wizard; buildAgreementClosing
 *  below renders the closing "IN WITNESS WHEREOF" + signature/witness blocks. */
export function buildAgreementHtml(info: AgreementInfo): string {
  const recitalParagraphs = info.recitals.length > 0 ? info.recitals : ['[Recitals — the background and purpose of this Agreement]'];
  return (
    `<h3 style="text-align:center;">${escapeHtml(info.title || 'AGREEMENT')}</h3>` +
    `<p style="text-align:center;">This Agreement is made on ${escapeHtml(info.date) || '[Date]'} at ${
      escapeHtml(info.place) || '[Place]'
    }</p>` +
    `<p style="text-align:center;"><strong>BETWEEN</strong></p>` +
    `<p>${escapeHtml(info.partyAName) || '[Party A Name]'}, ${
      escapeHtml(info.partyAAddress) || '[Party A Address]'
    } (hereinafter referred to as "the ${escapeHtml(
      info.partyARole
    )}", which expression shall, unless repugnant to the context or meaning thereof, include its/his/her successors, heirs, legal representatives, and permitted assigns), of the FIRST PART;</p>` +
    `<p style="text-align:center;"><strong>AND</strong></p>` +
    `<p>${escapeHtml(info.partyBName) || '[Party B Name]'}, ${
      escapeHtml(info.partyBAddress) || '[Party B Address]'
    } (hereinafter referred to as "the ${escapeHtml(
      info.partyBRole
    )}", which expression shall, unless repugnant to the context or meaning thereof, include its/his/her successors, heirs, legal representatives, and permitted assigns), of the SECOND PART;</p>` +
    `<p>(the "${escapeHtml(info.partyARole)}" and the "${escapeHtml(
      info.partyBRole
    )}" are hereinafter collectively referred to as the "Parties" and individually as a "Party")</p>` +
    `<p><strong>WHEREAS:</strong></p>` +
    recitalParagraphs.map((r) => `<p>${escapeHtml(r)}</p>`).join('') +
    `<p><strong>NOW THEREFORE</strong>, in consideration of the mutual covenants contained herein, the Parties agree as follows:</p>`
  );
}

export interface AgreementSignatory {
  role: string;
  name: string;
}

/** The deed's closing — "IN WITNESS WHEREOF" plus right-aligned signature blocks for both
 *  parties and two witness lines, matching how real agreements close (distinct from a
 *  filing's Verification/DEPONENT closing). */
export function buildAgreementClosing(signatories: AgreementSignatory[]): LegalDraftSection[] {
  return [
    {
      unnumbered: true,
      paragraphs: [
        'IN WITNESS WHEREOF, the Parties have set their hands to this Agreement on the date first above written, in the presence of the witnesses below.',
      ],
    },
    ...signatories.map((s) => ({
      unnumbered: true,
      align: 'right' as const,
      paragraphs: [`(${s.name || `[${s.role} Name]`})`, s.role],
    })),
    {
      heading: 'Witnesses',
      unnumbered: true,
      paragraphs: ['1. ______________________', '2. ______________________'],
    },
  ];
}

/** Returns two sections — a centered-heading Verification block, plus a separate right-aligned
 *  "DEPONENT" signature line, matching how real affidavits close: the verification text as
 *  ordinary prose, then the deponent's attestation flush against the right margin below it. */
export function buildVerificationSection(deponentName: string, place?: string): LegalDraftSection[] {
  return [
    {
      heading: 'Verification',
      unnumbered: true,
      headingAlign: 'center',
      paragraphs: [
        `I, ${
          deponentName || '[Deponent Name]'
        }, the deponent above named, do hereby verify that the contents of the foregoing paragraphs are true and correct to the best of my knowledge and belief, and that nothing material has been concealed therefrom.`,
        `Verified at ${place || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()}.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
  ];
}
