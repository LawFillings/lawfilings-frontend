import { useLanguage } from '../lib/language';
import './FilingGuidance.css';

export type FilingForum =
  | 'drt'
  | 'drat'
  | 'nclt'
  | 'nclat'
  | 'consumerCommission'
  | 'districtCourt'
  | 'commercialCourt'
  | 'criminalCourt'
  | 'mediationAuthority'
  | 'notFiledNotice'
  | 'notFiledAgreement';

/** Maps a `CaseType`/`Forum`'s raw `forumType` string (e.g. 'DRT', 'NCLAT', 'district_court') to
 *  the FilingGuidance content key — for wizards (Execution, Generic, Appeal) that resolve their
 *  forum dynamically from a selected CaseType rather than having a single fixed forum of their
 *  own. Falls back to 'districtCourt' for an unrecognised value, since that's the most generic
 *  "goes to a physical court registry" guidance rather than something DRT/NCLT-specific.
 */
export function forumTypeToFilingForum(forumType: string): FilingForum {
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
