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
  { id: 'maharashtra', label: 'Maharashtra' },
  { id: 'karnataka', label: 'Karnataka' },
  { id: 'tamil-nadu', label: 'Tamil Nadu' },
  { id: 'west-bengal', label: 'West Bengal' },
  { id: 'gujarat', label: 'Gujarat' },
  { id: 'madhya-pradesh', label: 'Madhya Pradesh' },
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
  // Chhatrapati Sambhajinagar (formerly Aurangabad) and Dharashiv (formerly Osmanabad) renamed by
  // Centre notification, 24 February 2023 — current official names used here.
  maharashtra: toDistrictLocations([
    'Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur',
    'Chhatrapati Sambhajinagar', 'Dhule', 'Dharashiv', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon',
    'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar',
    'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg',
    'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
  ]),
  // Bengaluru's split into North/South/Rural-successor districts is tied to the 2025 Greater
  // Bengaluru Authority municipal reorganization, whose district-level (as opposed to
  // corporation-level) status was not confirmed as finalised — kept as the long-stable
  // Bengaluru Urban / Bengaluru Rural pair pending that confirmation; re-verify before relying.
  karnataka: toDistrictLocations([
    'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
    'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada',
    'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
    'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
    'Vijayapura', 'Vijayanagara', 'Yadgir',
  ]),
  'tamil-nadu': toDistrictLocations([
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul',
    'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai',
    'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
    'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Thanjavur', 'Theni', 'Thoothukudi',
    'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Tiruvarur', 'Tenkasi', 'Vellore', 'Viluppuram', 'Virudhunagar',
  ]),
  // A 2022 cabinet in-principle approval to split 7 new districts out of these 23 (Sundarban,
  // Ichhemati, Ranaghat, Bishnupur, Jangipur, Behrampur, Basirhat) was still only a budget-session
  // proposal (June 2026), not a notified reorganization, as of this sourcing — using the current
  // operational 23-district list; re-verify before relying.
  'west-bengal': toDistrictLocations([
    'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly',
    'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia',
    'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman',
    'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
  ]),
  // Vav-Tharad (carved from Banaskantha) formed 2 October 2025 — the newest of the 34.
  gujarat: toDistrictLocations([
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad',
    'Chhota Udepur', 'Dahod', 'Dang', 'Devbhumi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
    'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari',
    'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi',
    'Vadodara', 'Valsad', 'Vav-Tharad',
  ]),
  'madhya-pradesh': toDistrictLocations([
    'Bhopal', 'Raisen', 'Rajgarh', 'Sehore', 'Vidisha', 'Morena', 'Bhind', 'Sheopur', 'Gwalior',
    'Ashoknagar', 'Datia', 'Guna', 'Shivpuri', 'Indore', 'Alirajpur', 'Barwani', 'Burhanpur', 'Dhar',
    'Jhabua', 'Khandwa', 'Khargone', 'Jabalpur', 'Balaghat', 'Chhindwara', 'Dindori', 'Katni',
    'Mandla', 'Narsinghpur', 'Pandhurna', 'Seoni', 'Narmadapuram', 'Betul', 'Harda', 'Rewa', 'Maihar',
    'Mauganj', 'Satna', 'Sidhi', 'Singrauli', 'Sagar', 'Chhatarpur', 'Damoh', 'Niwari', 'Panna',
    'Tikamgarh', 'Shahdol', 'Anuppur', 'Umaria', 'Ujjain', 'Agar Malwa', 'Dewas', 'Mandsaur',
    'Neemuch', 'Ratlam', 'Shajapur',
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
  maharashtra: { minAmount: 500000, note: 'Verified against the Maharashtra (formerly Bombay) Civil Courts Act, 1869, section 24, as amended by the Bombay Civil Courts (Amendment) Act, 2011: a Civil Judge, Junior Division has jurisdiction only up to ₹5,00,000. Above that, a Civil Judge, Senior Division and the District Judge hold concurrent, effectively unlimited original jurisdiction under sections 25 and 7 — so ₹5,00,000 is the genuine minimum for filing at this "District Court" tier, matching the pattern seen in Uttar Pradesh. Note: the Bombay City Civil Court (Mumbai only) is a separate special court with its own, much higher pecuniary jurisdiction (raised to ₹10 crore by a 2023-24 amendment) — this figure does not apply within Greater Mumbai.' },
  karnataka: { minAmount: 500000, note: 'Verified against the Karnataka Civil Courts Act, 1964, as amended by the Karnataka Civil Courts (Amendment) Act, 2007 (w.e.f. 28 August 2007): a Civil Judge, Junior Division has jurisdiction up to ₹50,000, and a Civil Judge, Senior Division up to ₹5,00,000. Suits above ₹5,00,000 fall within the District Court\'s original jurisdiction. Note: as of a 2023 report, the Karnataka High Court itself has recommended raising these limits as "long overdue," but no amendment giving effect to that recommendation was found as of this sourcing — reconfirm with the Karnataka High Court before relying on this figure.' },
  'tamil-nadu': { minAmount: 500000, note: 'Verified against the Tamil Nadu Civil Courts Act, 1873, section 12: the District Judge\'s original civil jurisdiction covers suits exceeding ₹5,00,000. Tamil Nadu\'s structure is more layered than most other states covered here, though: a Subordinate Judge holds concurrent original jurisdiction for suits from ₹1,00,000 up to ₹10,00,000, and a District Munsif up to ₹10,00,000 as well — so a suit valued between ₹1,00,000 and ₹10,00,000 may in practice be filed before a Subordinate Judge (a lower court not covered by this "District Court" forum) rather than the District Judge directly. Confirm the correct court with the specific district\'s roster before filing.' },
  'west-bengal': { note: 'Under the Bengal, Agra and Assam Civil Courts Act, 1887 as applied in West Bengal, a Civil Judge (Senior Division)/District Judge can be given effectively unlimited original pecuniary jurisdiction by classification — no clean statutory rupee floor marking where "District Court" jurisdiction begins could be independently confirmed this pass (sources describing the current, amended state of section 21\'s appeal-value figures were inconsistent). Confirm the operative pecuniary allocation for the specific district directly with the Calcutta High Court before filing.' },
  gujarat: { minAmount: 2500000, note: 'Per a secondary source, the pecuniary jurisdiction of a Civil Judge under the Gujarat Civil Courts Act, 2005 was raised to ₹25,00,000 by a 2020 amendment (following an earlier increase, via a Gujarat High Court notification dated 14 October 2014, of the District Judge appellate-jurisdiction threshold from ₹5,00,000 to ₹10,00,000) — suits above ₹25,00,000 would fall within the District Court\'s (Principal Civil Court of original jurisdiction under section 12) own original jurisdiction. The primary amending notification for the ₹25,00,000 figure could not be independently located this pass — confirm with the Gujarat High Court before relying on this as an exact floor.' },
  'madhya-pradesh': { minAmount: 10000000, note: 'Verified against the Madhya Pradesh Civil Courts Act, 1958, as amended by the Civil Courts (Amendment) Act, 2014: a Civil Judge, Class-II has jurisdiction up to ₹5,00,000 (up from ₹2.5 lakh), and a Civil Judge, Class-I up to ₹1,00,00,000 (up from ₹10 lakh) — the highest Class-I ceiling of any state covered here. The District Judge\'s own original jurisdiction begins above ₹1,00,00,000. Confirm with the Madhya Pradesh High Court before relying on this as an exact current floor.' },
};
