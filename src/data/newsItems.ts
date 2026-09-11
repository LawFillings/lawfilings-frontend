// The news items themselves now live in each language's translation tree (t.landing.news.items
// in src/lib/translations/*.ts) rather than here, so they can be localized — see en.ts for the
// canonical English text and its sourcing discipline. Keep that discipline when adding new items:
// verify against the primary source (the Act itself, a court judgment, an official notification)
// before publishing, in every language, the same as the Law Library.

export interface ExternalLawNewsSite {
  name: string;
  url: string;
}

// Independent legal journalism outlets, not affiliated with LawFilings — linked out for readers
// who want broader day-to-day legal news beyond the verified items curated above. Each URL was
// checked live before adding; re-verify before changing.
export const externalLawNewsSites: ExternalLawNewsSite[] = [
  { name: 'LiveLaw', url: 'https://www.livelaw.in/' },
  { name: 'Bar & Bench', url: 'https://www.barandbench.com/' },
  { name: 'SCC Online Blog', url: 'https://www.scconline.com/blog/' },
];
