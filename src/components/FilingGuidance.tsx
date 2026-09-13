import { useLanguage } from '../lib/language';
import './FilingGuidance.css';

export type FilingForum =
  | 'drt'
  | 'drat'
  | 'nclt'
  | 'nclat'
  | 'consumerCommission'
  | 'districtCourt'
  | 'highCourt'
  | 'highCourtOriginal'
  | 'familyCourt'
  | 'rentControlAuthority'
  | 'supremeCourt'
  | 'commercialCourt'
  | 'criminalCourt'
  | 'mediationAuthority'
  | 'citAppeals'
  | 'itat'
  | 'gstAppeals'
  | 'gstat'
  | 'cestat'
  | 'notFiledNotice'
  | 'notFiledAgreement';

// tax_matters groups five genuinely separate filing destinations (each with its own portal and
// procedure) under one forum tab — forumType alone can't disambiguate them, so this maps the
// specific CaseType id instead. See the `forums` array's comment on 'f-tax' in mockData.ts.
const TAX_CASE_TYPE_TO_FILING_FORUM: Record<string, FilingForum> = {
  'ct-cit-appeal': 'citAppeals',
  'ct-cit-stay-application': 'citAppeals',
  'ct-itat-appeal': 'itat',
  'ct-itat-stay-application': 'itat',
  'ct-itat-rectification': 'itat',
  'ct-gst-appeal-first': 'gstAppeals',
  'ct-gstat-appeal': 'gstat',
  'ct-gstat-rectification': 'gstat',
  'ct-cestat-appeal': 'cestat',
  'ct-cestat-rectification': 'cestat',
};

/** Maps a `CaseType`/`Forum`'s raw `forumType` string (e.g. 'DRT', 'NCLAT', 'district_court') to
 *  the FilingGuidance content key — for wizards (Execution, Generic, Appeal) that resolve their
 *  forum dynamically from a selected CaseType rather than having a single fixed forum of their
 *  own. Falls back to 'districtCourt' for an unrecognised value, since that's the most generic
 *  "goes to a physical court registry" guidance rather than something DRT/NCLT-specific.
 *
 *  `filingCategory`, when given, disambiguates 'high_court': an 'appeal' (memorandum of appeal,
 *  certified copy of the decree, ad valorem fee) gets 'highCourt', while anything else (a writ,
 *  habeas corpus, contempt, election petition, and the like — filed directly on the original/
 *  miscellaneous side, not as an appeal from a lower court) gets 'highCourtOriginal' instead.
 *  Omit it only when the caller's own case types are always one or the other regardless (e.g. a
 *  wizard used exclusively for appeals) — every new call site should pass it.
 *
 *  `caseTypeId`, when given, disambiguates 'tax_matters' via TAX_CASE_TYPE_TO_FILING_FORUM above —
 *  required for that forumType, since forumType alone is the same for all five tax destinations.
 */
export function forumTypeToFilingForum(forumType: string, filingCategory?: string, caseTypeId?: string): FilingForum {
  switch (forumType) {
    case 'DRT':
      return 'drt';
    case 'DRAT':
      return 'drat';
    case 'NCLT':
      return 'nclt';
    case 'NCLAT':
      return 'nclat';
    case 'consumer_commission':
      return 'consumerCommission';
    case 'district_court':
      return 'districtCourt';
    case 'high_court':
      return filingCategory && filingCategory !== 'appeal' ? 'highCourtOriginal' : 'highCourt';
    case 'supreme_court':
      return 'supremeCourt';
    case 'family_court':
      return 'familyCourt';
    case 'tax_matters':
      return (caseTypeId && TAX_CASE_TYPE_TO_FILING_FORUM[caseTypeId]) || 'districtCourt';
    default:
      return 'districtCourt';
  }
}

interface Props {
  forum: FilingForum;
  /** A pre-formatted label for whatever the user already selected earlier in the wizard —
   *  e.g. "DRT Mumbai (DRT 2)", "New Delhi District". When given, it's woven into the intro line
   *  so the guidance reads as specific to their filing, not generic boilerplate. */
  contextLabel?: string;
}

export function FilingGuidance({ forum, contextLabel }: Props) {
  const { t } = useLanguage();
  const copy = t.filingGuidance[forum];

  return (
    <section className="filing-guidance">
      <p className="filing-guidance-eyebrow">{t.filingGuidance.eyebrow}</p>
      <h3 className="filing-guidance-heading">{copy.heading}</h3>
      <p className="filing-guidance-intro">
        {contextLabel ? t.filingGuidance.contextPrefix(contextLabel) : ''}
        {copy.intro}
      </p>
      <ol className="filing-guidance-steps">
        {copy.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {'portalUrl' in copy && (
        <a className="filing-guidance-portal-link" href={copy.portalUrl} target="_blank" rel="noreferrer">
          {copy.portalLabel} ↗
        </a>
      )}
      <p className="filing-guidance-note">{copy.note}</p>
    </section>
  );
}
