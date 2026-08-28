// Fixed ids mirroring the backend seed (legal-platform-backend/scripts/seed.ts), kept as literal
// constants rather than resolved via a catalog API round-trip — same approach already used for
// the District Court ids in districtCourtLocations.ts. These back the case-law precedent lookup,
// the only backend-calling feature these two wizards use.
export const DRT_WS_CASE_TYPE_ID = '10000000-0000-0000-0000-000000000005';
export const CC_COMPLAINT_CASE_TYPE_ID = '10000000-0000-0000-0000-000000000004';
