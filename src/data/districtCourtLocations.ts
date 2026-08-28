// State and district data for the District Court wizards, used by the generic LocationSelector
// component (called twice in sequence: state, then district scoped to that state). District
// lists are sourced from current (2026) Wikipedia district-list pages, cross-checked against
// recent news for districts created after those pages' last stable revision (e.g. Hansi, Haryana's
// 23rd district, formed December 2025; Rajasthan's 41-district count reflects the December 2024
// reorganization that dissolved 9 districts created the prior year). Districts are periodically
// created, renamed, or dissolved by state notification — re-verify before relying on this list
// for anything beyond a bench-selection dropdown.
import type { ForumLocation } from './forumLocations';

// Fixed IDs mirroring the backend seed (scripts/seed.ts) — kept as literal constants rather than
// resolved via a catalog API round-trip, since only case-creation/draft endpoints are wired to
// the real backend this iteration (see plan §1).
export const DISTRICT_COURT_FORUM_ID = '10000000-0000-0000-0000-000000000001';
export const MONEY_RECOVERY_CASE_TYPE_ID = '10000000-0000-0000-0000-000000000002';
export const SUMMARY_SUIT_CASE_TYPE_ID = '10000000-0000-0000-0000-000000000003';

export const districtCourtStates: ForumLocation[] = [
  { id: 'delhi', label: 'Delhi' },
  { id: 'jk', label: 'Jammu & Kashmir' },
  { id: 'punjab', label: 'Punjab' },
  { id: 'haryana', label: 'Haryana' },
  { id: 'himachal-pradesh', label: 'Himachal Pradesh' },
  { id: 'up', label: 'Uttar Pradesh' },
  { id: 'rajasthan', label: 'Rajasthan' },
];

function toDistrictLocations(names: string[]): ForumLocation[] {
  return names.map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: name }));
}

export const districtCourtDistrictsByState: Record<string, ForumLocation[]> = {
  delhi: toDistrictLocations([
    'Central', 'East', 'New Delhi', 'North', 'North East', 'North West', 'Shahdara', 'South',
    'South East', 'South West', 'West',
  ]),
  jk: toDistrictLocations([
    'Jammu', 'Kathua', 'Samba', 'Udhampur', 'Reasi', 'Rajouri', 'Poonch', 'Doda', 'Ramban', 'Kishtwar',
    'Anantnag', 'Kulgam', 'Pulwama', 'Shopian', 'Budgam', 'Srinagar', 'Ganderbal', 'Bandipora',
    'Baramulla', 'Kupwara',
  ]),
  punjab: toDistrictLocations([
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Firozpur',
    'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
    'Sri Muktsar Sahib', 'Pathankot', 'Patiala', 'Rupnagar', 'SAS Nagar (Mohali)', 'Sangrur',
    'SBS Nagar (Nawanshahr)', 'Tarn Taran',
  ]),
  haryana: toDistrictLocations([
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hansi', 'Hisar',
    'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
    'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
  ]),
  'himachal-pradesh': toDistrictLocations([
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul & Spiti', 'Mandi',
    'Shimla', 'Sirmaur', 'Solan', 'Una',
  ]),
  up: toDistrictLocations([
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh',
    'Bagpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi',
    'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
    'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda',
    'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
    'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur',
    'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad',
    'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur',
    'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
    'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi',
  ]),
  rajasthan: toDistrictLocations([
    'Ajmer', 'Alwar', 'Balotra', 'Banswara', 'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara',
    'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Deeg', 'Didwana-Kuchaman', 'Dholpur',
    'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
    'Karauli', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror', 'Nagaur', 'Pali', 'Phalodi',
    'Pratapgarh', 'Rajsamand', 'Salumbar', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar',
    'Tonk', 'Udaipur',
  ]),
};

export interface PecuniaryLimit {
  minAmount?: number;
  note: string;
}

// District Court pecuniary jurisdiction is set per state and revised periodically by a mix of
// state amendment Acts and High Court notifications; unlike DRT's single national threshold,
// there is no one figure to fall back on here. Each entry's `note` cites the specific Act,
// section, and (where applicable) notification the `minAmount` was verified against, and flags
// any part of the picture that couldn't be independently confirmed. `minAmount` is left
// undefined where the underlying law gives the District Judge unlimited or overlapping
// jurisdiction rather than a clean floor (see the note in that case) — every consuming
// component must show the note alongside the figure, and must not assume `minAmount` is always
// present. Sourced current as of August 2026; re-verify periodically, since notifications can
// supersede an Act's own figures without amending the Act text.
export const districtCourtPecuniaryLimits: Record<string, PecuniaryLimit> = {
  delhi: { minAmount: 10000, note: 'Verified against two sources: (1) the Provincial Small Cause Courts (Delhi Amendment) Act, 1996, which sets Delhi\'s Small Cause Court money-suit jurisdiction at ₹5,000 by default (up to ₹10,000 by government notification) — suits within that range belong in Small Causes Court, not District Court; and (2) the Delhi High Court Act, 1966, section 5(2), as amended by the Delhi High Court (Amendment) Act, 2015 (w.e.f. 26 October 2015), under which Delhi\'s District Courts handle civil suits up to ₹2 crore, with only suits exceeding that going to the High Court\'s original side. So money recovery suits roughly between ₹10,000 and ₹2 crore belong at District Court; below ₹10,000, consider Small Causes Court instead.' },
  jk: { note: 'Under the Jammu and Kashmir State Civil Courts Act, 1977 (1920 A.D.), section 20, the District Judge has unlimited pecuniary jurisdiction by statute — there is no fixed rupee floor above which a suit must go to the District Judge rather than a Subordinate Judge or Munsiff; that split is set by High Court classification under section 21. The Act\'s own Munsiff limit (₹15,000, or ₹25,000 by special notification) is clearly outdated, and a current superseding notification could not be located — confirm the operative value split directly with the High Court of Jammu & Kashmir and Ladakh before filing.' },
  punjab: { note: 'Under the Punjab Courts Act, 1918, section 25 (as amended by Central Act 35 of 2003), the District Judge\'s own original jurisdiction is capped at ₹20 lakh — a ceiling, not a floor. Subordinate/Civil Judges (Senior Division) can independently be given unlimited pecuniary jurisdiction by High Court classification under section 26 (see Notification No. 382 dated 21 July 2003), so in practice most money recovery suits, including high-value ones, are filed before a Subordinate Judge rather than the District Judge. There is no single "minimum value for District Court" figure to give — confirm the current judge-class allocation with the High Court of Punjab and Haryana.' },
  haryana: { note: 'Haryana continues to apply the Punjab Courts Act, 1918 (no separate Haryana Courts Act was found). Under section 25 (as amended by Central Act 35 of 2003), the District Judge\'s own original jurisdiction is capped at ₹20 lakh — a ceiling, not a floor. Civil Judges (Senior Division) can independently be given unlimited pecuniary jurisdiction by High Court classification under section 26, so in practice most money recovery suits, including high-value ones, are filed before a Civil Judge rather than the District Judge. There is no single "minimum value for District Court" figure to give — confirm the current judge-class allocation with the High Court of Punjab and Haryana.' },
  'himachal-pradesh': { minAmount: 6000000, note: 'Verified against Himachal Pradesh High Court Notification No. HHC/PJ/93-I, dated 17 October 2022 (issued under the Himachal Pradesh Courts Act, 1976): District Judge/Additional District Judge has pecuniary jurisdiction for suits above ₹60 lakh up to ₹1 crore; below that, suits go to the Senior Civil Judge (₹30 lakh–₹60 lakh) or Civil Judge (up to ₹30 lakh) instead. This is the most recent notification found — reconfirm with the HP High Court if filing close to these thresholds, since notifications can be superseded without amending the underlying Act.' },
  up: { minAmount: 100000, note: 'Verified against the Bengal, Agra and Assam Civil Courts Act, 1887, section 19, as amended for Uttar Pradesh by U.P. Act 14 of 2015: a Munsif (Civil Judge, Junior Division) has jurisdiction only up to ₹1,00,000 (up to ₹5,00,000 in a court specially notified by the State Government). Suits above that go to a Subordinate Judge (Civil Judge, Senior Division) or the District Judge instead, both of whom have unlimited pecuniary jurisdiction under section 18 — so ₹1,00,000 is the genuine minimum for this "District Court" tier, though it rises to ₹5,00,000 in specific notified courts. Confirm whether the district you\'re filing in has been specially notified.' },
  rajasthan: { minAmount: 500000, note: 'Verified against the Rajasthan Civil Courts (Amendment) Act, 2014 (Act 15 of 2014), substituting section 19 of the Rajasthan Civil Courts Ordinance, 1950: a Civil Judge has jurisdiction up to ₹2 lakh, and a Senior Civil Judge up to ₹5 lakh. Suits above ₹5 lakh most likely fall to the District Judge, by the same pattern seen in Himachal Pradesh, Punjab, and Uttar Pradesh, but the District Judge\'s own jurisdiction provision (section 18 of the Ordinance) could not be independently verified — confirm with the Rajasthan High Court before relying on ₹5,00,000 as an exact floor.' },
};
