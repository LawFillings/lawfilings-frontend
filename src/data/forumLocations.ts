// Location/bench data for forums with territorial jurisdiction, used by the generic
// LocationSelector component. Each list notes its sourcing so accuracy can be judged per forum
// rather than assuming one blanket confidence level for all of them.

export interface ForumLocation {
  id: string;
  label: string;
  meta?: string; // secondary info shown alongside the label (e.g. which appellate body it feeds)
  city?: string; // the bench's city alone, for cause-title placement, separate from `label`'s "DRT X (Bench N)" display form
  benchNumber?: string; // Roman numeral (I/II/III) for cities with more than one DRT bench, matching cause-title convention
}

// Sourced directly from nclt.gov.in (official) — highest confidence of the three lists here.
export const nclBenchLocations: ForumLocation[] = [
  { id: 'new-delhi-principal', label: 'NCLT New Delhi (Principal Bench)' },
  { id: 'new-delhi', label: 'NCLT New Delhi' },
  { id: 'ahmedabad', label: 'NCLT Ahmedabad' },
  { id: 'allahabad', label: 'NCLT Allahabad' },
  { id: 'amravati', label: 'NCLT Amravati' },
  { id: 'bengaluru', label: 'NCLT Bengaluru' },
  { id: 'chandigarh', label: 'NCLT Chandigarh' },
  { id: 'chennai', label: 'NCLT Chennai' },
  { id: 'cuttack', label: 'NCLT Cuttack' },
  { id: 'guwahati', label: 'NCLT Guwahati' },
  { id: 'hyderabad', label: 'NCLT Hyderabad' },
  { id: 'indore', label: 'NCLT Indore' },
  { id: 'jaipur', label: 'NCLT Jaipur' },
  { id: 'kochi', label: 'NCLT Kochi' },
  { id: 'kolkata', label: 'NCLT Kolkata' },
  { id: 'mumbai', label: 'NCLT Mumbai' },
];

// DRT benches — compiled from secondary legal-reference sites, cross-checked against each
// other but NOT yet verified against drt.gov.in or a gazette notification. See BenchSelector's
// verify-note for the user-facing caveat; keep this same caution if this list is extended.
const ROMAN = ['I', 'II', 'III'];

/** Expands a city with more than one DRT bench into one entry per bench, each carrying its own
 *  Roman-numeral benchNumber (matching the cause-title convention "TRIBUNAL-II") separately from
 *  the Arabic-numbered "(DRT 1/2/3)" labelling used for bench selection — those two numbering
 *  styles coexist in real practice and shouldn't be conflated. */
function benches(id: string, city: string, count: number, meta: string): ForumLocation[] {
  if (count === 1) return [{ id, label: `DRT ${city}`, city, meta }];
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-${i + 1}`,
    label: `DRT ${city} (DRT ${i + 1})`,
    city,
    benchNumber: ROMAN[i] ?? String(i + 1),
    meta,
  }));
}

// Bench counts per city verified against the user's own DRT Order Builder tool (Aug 2026) —
// several cities have 2 or 3 co-located benches, which this list previously missed entirely (one
// entry per city, no bench count, so a filing there would have cited the wrong bench). The
// Roman-numeral bench suffix used in the cause title (e.g. "TRIBUNAL-II") is confirmed against
// an actual filed, notarised OA.
export const drtBenchLocations: ForumLocation[] = [
  ...benches('delhi', 'New Delhi', 3, 'Appeals to DRAT Delhi'),
  ...benches('chandigarh', 'Chandigarh', 3, 'Appeals to DRAT Delhi'),
  ...benches('jaipur', 'Jaipur', 1, 'Appeals to DRAT Delhi'),
  ...benches('mumbai', 'Mumbai', 3, 'Appeals to DRAT Mumbai'),
  ...benches('ahmedabad', 'Ahmedabad', 2, 'Appeals to DRAT Mumbai'),
  ...benches('aurangabad', 'Aurangabad', 1, 'Appeals to DRAT Mumbai'),
  ...benches('nagpur', 'Nagpur', 1, 'Appeals to DRAT Mumbai'),
  ...benches('pune', 'Pune', 1, 'Appeals to DRAT Mumbai'),
  ...benches('kolkata', 'Kolkata', 3, 'Appeals to DRAT Kolkata'),
  ...benches('hyderabad', 'Hyderabad', 2, 'Appeals to DRAT Kolkata'),
  ...benches('vishakhapatnam', 'Vishakhapatnam', 1, 'Appeals to DRAT Kolkata'),
  ...benches('siliguri', 'Siliguri', 1, 'Appeals to DRAT Kolkata'),
  ...benches('cuttack', 'Cuttack', 1, 'Appeals to DRAT Kolkata'),
  ...benches('guwahati', 'Guwahati', 1, 'Appeals to DRAT Kolkata'),
  ...benches('chennai', 'Chennai', 3, 'Appeals to DRAT Chennai'),
  ...benches('bengaluru', 'Bangalore', 2, 'Appeals to DRAT Chennai'),
  ...benches('coimbatore', 'Coimbatore', 1, 'Appeals to DRAT Chennai'),
  ...benches('ernakulam', 'Ernakulam', 2, 'Appeals to DRAT Chennai'),
  ...benches('madurai', 'Madurai', 1, 'Appeals to DRAT Chennai'),
  ...benches('allahabad', 'Allahabad', 1, 'Appeals to DRAT Allahabad'),
  ...benches('dehradun', 'Dehradun', 1, 'Appeals to DRAT Allahabad'),
  ...benches('jabalpur', 'Jabalpur', 1, 'Appeals to DRAT Allahabad'),
  ...benches('lucknow', 'Lucknow', 1, 'Appeals to DRAT Allahabad'),
  ...benches('patna', 'Patna', 1, 'Appeals to DRAT Allahabad'),
  ...benches('ranchi', 'Ranchi', 1, 'Appeals to DRAT Allahabad'),
];

// States and Union Territories of India — one State Consumer Commission per entry. Stable,
// well-established list (post-2019 J&K/Ladakh reorganisation reflected).
export const consumerStateLocations: ForumLocation[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
].map((state) => ({ id: state.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: `State Consumer Commission, ${state}` }));
