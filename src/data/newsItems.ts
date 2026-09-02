export interface NewsItem {
  id: string;
  date: string; // display string, not parsed
  title: string;
  summary: string;
  tag: string;
}

// Every item here traces to something actually verified against a primary source during this
// platform's own build — no filler. When adding new items, the same bar applies: verify
// against the primary source (the Act itself, a court judgment, an official notification)
// before publishing, the same discipline used for the Law Library itself.
export const newsItems: NewsItem[] = [
  {
    id: 'drat-deadline',
    date: '2016 amendment, still widely misquoted',
    title: 'DRAT appeal deadline is 30 days, not 45',
    summary:
      'A 2016 amendment to the RDDBFI Act quietly shortened the DRAT appeal window from 45 to 30 days. Many secondary sources still cite the old figure — we verified this directly against the current Act text on India Code.',
    tag: 'DRT / DRAT',
  },
  {
    id: 'cpa-thresholds',
    date: 'December 2021 notification',
    title: 'Consumer Commission jurisdiction: ₹50 lakh / ₹2 crore, not the Act’s printed figures',
    summary:
      'The Consumer Protection Act, 2019 as originally printed sets District/State/National jurisdiction at ₹1 crore / ₹10 crore. A 2021 notification revised the operative thresholds down to ₹50 lakh / ₹2 crore — confirmed by the Supreme Court in 2025. Our forum selector uses the current notified values.',
    tag: 'Consumer Commission',
  },
  {
    id: 'dpdp-timeline',
    date: 'Rules notified 13 Nov 2025',
    title: 'DPDP Act: what’s actually in force, and what isn’t yet',
    summary:
      'The Consent Manager framework becomes operational in November 2026. Full substantive compliance — consent, breach reporting, data rights — isn’t legally required until May 2027. Worth knowing before assuming a platform’s privacy posture is behind schedule.',
    tag: 'Data protection',
  },
  {
    id: 'sarfaesi-added',
    date: 'Just added',
    title: 'SARFAESI Act now in Constitution & Key Statutes',
    summary:
      'Enforcement, DRT application, appeal, and limitation provisions — sourced directly from India Code, not summarised. Read alongside the RDDBFI Act if you’re dealing with a bank enforcement action.',
    tag: 'Constitution & Key Statutes',
  },
];
