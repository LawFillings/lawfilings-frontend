// Court/forum picker layout shared by the Home picker and the phone landing shortcuts:
// one array per centred row of buttons, and display labels that differ from the forum's own name.
export const forumRows: string[][] = [
  ['misc_drafts', 'district_court', 'high_court', 'supreme_court'],
  ['DRT', 'NCLT', 'tax_matters'],
  ['consumer_commission'],
];

export const forumTabLabel: Record<string, string> = {
  DRT: 'DRT/DRAT',
  NCLT: 'NCLT/NCLAT',
  consumer_commission: 'Consumer Forum',
};
