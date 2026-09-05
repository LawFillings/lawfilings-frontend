export interface CauseListCourt {
  id: string;
  name: string;
  category: 'Supreme Court' | 'High Court' | 'District Court' | 'DRT' | 'NCLT' | 'NCLAT';
  /** 'auto': backend fetches the PDF directly, no advocate action needed.
   *  'auto-scoped': backend fetches automatically, but only a specific judge/court-hall slice of
   *  the day's list, named by the advocate — the full combined list is too large or too costly to
   *  fetch on every lookup, but the source site itself supports filtering to one bench directly.
   *  'manual': advocate downloads the cause list themselves (captcha-gated at the source, the
   *  filename isn't cleanly derivable from the date, or the combined document is too large for a
   *  single extraction call) and uploads it here — portalUrl points them to where to get it. */
  tier: 'auto' | 'auto-scoped' | 'manual';
  portalUrl: string;
  /** Required when tier === 'auto-scoped': label for the extra required input asking the advocate
   *  which judge/court-hall to scope the fetch to. */
  scopeLabel?: string;
}

// Live-verified (every portalUrl below was actually opened, and every 'auto' entry's fetch
// mechanism actually tested against a real, current PDF — not just found in a search snippet; see
// project memory for the two research sessions this catalog was built across). District Courts
// are still deferred to a later batch — 700+ is its own project.
//
// NCLT and NCLAT turned out to be the best-covered tribunals in this catalog: both serve a plain,
// captcha-free, GET-filterable listing page (Drupal Views, `?bench_id=...&date=...`), unlike DRT's
// captcha-gated portal — every NCLT/NCLAT bench below is 'auto'.
export const causeListCourts: CauseListCourt[] = [
  // Resolved 2026-09-05: the Judge-wise merits list's URL pattern is now confirmed live
  // (api.sci.gov.in/jonew/cl/{date}/[M|F]_J_1.pdf, scraped off the site's own cause-list index
  // page rather than guessed) — it's one merged, all-courts PDF (234 pages on a Miscellaneous day,
  // well within Sonnet 5's 600-page cap), with each court's matters under its own "COURT NO. : N"
  // heading. Auto-fetching this whole document and having Claude transcribe only the requested
  // court's heading resolves the original objection (a narrower list would misrepresent "the"
  // Supreme Court list) once the advocate is the one naming the court number.
  { id: 'supreme-court', name: 'Supreme Court of India', category: 'Supreme Court', tier: 'auto-scoped', scopeLabel: "Court No. (Court No. 1 is the Chief Justice's Court)", portalUrl: 'https://www.sci.gov.in/cause-list/' },

  // ---- High Courts: auto-fetch ----
  { id: 'delhi-high-court', name: 'Delhi High Court', category: 'High Court', tier: 'auto', portalUrl: 'https://delhihighcourt.nic.in/web/cause-lists/cause-list' },
  { id: 'allahabad-high-court', name: 'Allahabad High Court', category: 'High Court', tier: 'auto', portalUrl: 'https://www.allahabadhighcourt.in/causelist/indexA.html' },
  { id: 'gauhati-high-court', name: 'Gauhati High Court', category: 'High Court', tier: 'auto', portalUrl: 'https://ghconline.gov.in/index.php/consolidated-cause-list/' },
  { id: 'himachal-pradesh-high-court', name: 'Himachal Pradesh High Court', category: 'High Court', tier: 'auto', portalUrl: 'https://highcourt.hp.gov.in/causelist/netbd.php' },
  { id: 'jk-ladakh-high-court-srinagar', name: 'J&K and Ladakh High Court (Srinagar wing)', category: 'High Court', tier: 'auto', portalUrl: 'https://jkhighcourt.nic.in/causelistk.php' },
  { id: 'rajasthan-high-court-jodhpur', name: 'Rajasthan High Court (Jodhpur seat)', category: 'High Court', tier: 'auto', portalUrl: 'https://hcraj.nic.in/quick-causelist-jdp/' },

  // ---- High Courts: auto-scoped (full day's list is too large/costly, but the source site itself
  // supports filtering to one judge/court-hall directly, so a required advocate-supplied scope
  // makes auto-fetch genuinely feasible) ----
  { id: 'bombay-high-court', name: 'Bombay High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: "Judge's surname (as printed on the cause list) — the full list runs 2,000+ pages", portalUrl: 'https://bombayhighcourt.gov.in/bhc/causelistFinal' }, // the day's list is returned as one row per Coram/judge, each with its own small, directly-downloadable PDF — matching the given surname against a row picks just that judge's list instead of the 2,168-page merged document.
  { id: 'karnataka-high-court', name: 'Karnataka High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: 'Court Hall No. (1–40)', portalUrl: 'https://judiciary.karnataka.gov.in/causelistSearch.php' }, // the site's own "Search by Court Hall" mode returns clean, already-structured HTML for just that hall — parsed directly, no PDF/Claude call needed for this court at all.
  { id: 'calcutta-high-court', name: 'Calcutta High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: "Judge's surname (as printed on the cause list) — the full Appellate Side list runs 500+ pages", portalUrl: 'https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/highcourt_causelist.php?state_cd=16&dist_cd=1&court_code=3&stateNm=Calcutta' }, // the native calcuttahighcourt.gov.in merged list was too large (528 pages, moved to manual on 2026-09-05), but this eCourts-hosted "(From CIS)" report lists one row per judge/bench with its own small PDF — confirmed live, 14 pages for one bench.
  { id: 'kerala-high-court', name: 'Kerala High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: 'Court Room No. (e.g. 1, 3B — as shown on the cause list)', portalUrl: 'https://hckinfo.keralacourts.in/digicourt/Casedetailssearch/viewCauselist' }, // the "Entire List" link was too large (729 pages, moved to manual on 2026-09-05), but the same search response lists one row per Court Room with its own small PDF — confirmed live, 6 pages for one room.
  { id: 'andhra-pradesh-high-court', name: 'Andhra Pradesh High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: 'Court No. (e.g. 1)', portalUrl: 'https://aphc.gov.in/Hcdbs/search.jsp' }, // previously flagged captcha-gated (2026-09-05 correction: that finding doesn't hold up on live retest) — the site's own "Daily Cause List → Court Wise" flow is a plain, cookie-less POST returning clean, already-structured HTML (data-label attributes) for one court number — parsed directly, no PDF/Claude call needed.
  { id: 'telangana-high-court', name: 'Telangana High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: 'Court No. (e.g. 9)', portalUrl: 'https://causelist.tshc.gov.in/showDailyCauseList' }, // same "Daily Cause List → Court Wise" idea as Andhra Pradesh (the two split from one NIC codebase in 2014), but this is a separate, more modern Spring/Thymeleaf app underneath — confirmed live as an equally cookie-less POST, just a messier server-rendered table (leftover dead template comments) parsed positionally by column instead of by data-label.
  { id: 'manipur-high-court', name: 'Manipur High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: "Judge's surname (as printed on the cause list)", portalUrl: 'https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/highcourt_causelist.php?state_cd=25&dist_cd=1&court_code=1&stateNm=Manipur' }, // the old hcmimphal.nic.in link (blocked by decoy commented-out markup) has been superseded by the court's own current nav, which now points to this eCourts-CIS report — the same mechanism already live for Calcutta — confirmed live, one row per bench with its own small PDF.
  { id: 'tripura-high-court', name: 'Tripura High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: "Judge's surname (as printed on the cause list)", portalUrl: 'https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/highcourt_causelist.php?state_cd=20&dist_cd=1&court_code=1&stateNm=Tripura' }, // previously flagged captcha-gated (2026-09-05 correction: that check was against thc.nic.in's older Lawazima/Archive links) — the site's current "Main Cause List" link now routes through the same eCourts-CIS report as Calcutta/Manipur — confirmed live, 3 benches, no captcha.
  { id: 'punjab-haryana-high-court', name: 'Punjab and Haryana High Court', category: 'High Court', tier: 'auto-scoped', scopeLabel: 'Bar Council enrollment number and enrollment year (e.g. 1234 and 2015)', portalUrl: 'https://new.phhc.gov.in/cause/cause-list' }, // the old highcourtchd.gov.in list-type ambiguity is moot: the newer portal's backend (livedb9010.phhc.gov.in) is a plain, cookie-less, captcha-free JSON API with a direct by-advocate lookup — returns only that advocate's own matters for the day across every bench, already structured, no PDF/Claude call needed at all.

  // ---- High Courts: manual (each for a specific, documented reason — not simply unattempted) ----
  // Confirmed captcha at the actual list-generation step:
  { id: 'madras-high-court', name: 'Madras High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://hcmadras.tn.gov.in/cause_list_mhc.php' },
  { id: 'meghalaya-high-court', name: 'Meghalaya High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://meghalayahighcourt.nic.in/causelist' },
  { id: 'patna-high-court', name: 'Patna High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://patnahighcourt.gov.in/causelists/entire/clist' },
  // Was auto-fetch (the direct-PDF-URL pattern worked when originally verified — pre-Sept-2026
  // dated files still 200 as of this check), but the site's own "Cause List" nav link now points
  // to the captcha-gated hcservices.ecourts.gov.in portal instead, and no new dated files were
  // appearing at the old static path — a real migration caught by live retesting, not a fluke.
  { id: 'jharkhand-high-court', name: 'Jharkhand High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://hcservices.ecourts.gov.in/hcservices/main.php' },
  // Auto-fetch confirmed technically feasible (no captcha), but deferred this pass — see the
  // reason noted for each:
  { id: 'chhattisgarh-high-court', name: 'Chhattisgarh High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://highcourt.cg.gov.in/' }, // captcha-free JSON API confirmed (returns structured case rows directly, not a PDF) — needs a new text-based extraction path rather than the vision/document path every other entry here uses; not built this pass.
  { id: 'madhya-pradesh-high-court', name: 'Madhya Pradesh High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://mphc.gov.in/causelist' }, // same as Chhattisgarh — a captcha-free JSON API, needs the same not-yet-built text-extraction path. Only the Jabalpur principal seat was investigated; Indore/Gwalior benches use different, unconfirmed branch codes.
  { id: 'orissa-high-court', name: 'Orissa High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://www.orissahighcourt.nic.in/cause-list/' }, // captcha-free, but publishes a Weekly List (not a daily one) via unpredictable numeric wrapper-page IDs with no date in the URL — matching "today's" list reliably needs more investigation.
  { id: 'gujarat-high-court', name: 'Gujarat High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://gujarathc-casestatus.nic.in/' }, // unresolved: no captcha was found, but no working captcha-free path was confirmed either (a client-side token generator couldn't be traced) — flagged rather than guessed.
  // Could not verify live this session (network-level failures reaching the site, not stale URLs):
  { id: 'sikkim-high-court', name: 'Sikkim High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://hcs.gov.in/hcs/cause-list' },
  { id: 'uttarakhand-high-court', name: 'Uttarakhand High Court', category: 'High Court', tier: 'manual', portalUrl: 'https://highcourtofuttarakhand.gov.in/cause-list/' }, // note: the court's own page currently links a stale mid-2025 PDF — worth flagging to a real user independent of this project.

  // ---- NCLT: all 15 benches (31 courts across them), auto-fetch ----
  { id: 'nclt-principal-bench', name: 'NCLT Principal Bench (New Delhi)', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-new-delhi-2', name: 'NCLT New Delhi Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-new-delhi-3', name: 'NCLT New Delhi Bench, Court-III', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-new-delhi-4', name: 'NCLT New Delhi Bench, Court-IV', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-new-delhi-5', name: 'NCLT New Delhi Bench, Court-V', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-new-delhi-6', name: 'NCLT New Delhi Bench, Court-VI', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-ahmedabad-1', name: 'NCLT Ahmedabad Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-ahmedabad-2', name: 'NCLT Ahmedabad Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-allahabad-1', name: 'NCLT Allahabad Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-amaravati-1', name: 'NCLT Amaravati Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-bengaluru-1', name: 'NCLT Bengaluru Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-chandigarh-1', name: 'NCLT Chandigarh Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-chandigarh-2', name: 'NCLT Chandigarh Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-chennai-1', name: 'NCLT Chennai Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-chennai-2', name: 'NCLT Chennai Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-cuttack-1', name: 'NCLT Cuttack Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-guwahati-1', name: 'NCLT Guwahati Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-hyderabad-1', name: 'NCLT Hyderabad Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-hyderabad-2', name: 'NCLT Hyderabad Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-indore-1', name: 'NCLT Indore Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-jaipur-1', name: 'NCLT Jaipur Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-kochi-1', name: 'NCLT Kochi Bench', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-kolkata-1', name: 'NCLT Kolkata Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-kolkata-2', name: 'NCLT Kolkata Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-kolkata-3', name: 'NCLT Kolkata Bench, Court-III', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-1', name: 'NCLT Mumbai Bench, Court-I', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-2', name: 'NCLT Mumbai Bench, Court-II', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-3', name: 'NCLT Mumbai Bench, Court-III', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-4', name: 'NCLT Mumbai Bench, Court-IV', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-5', name: 'NCLT Mumbai Bench, Court-V', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },
  { id: 'nclt-mumbai-6', name: 'NCLT Mumbai Bench, Court-VI', category: 'NCLT', tier: 'auto', portalUrl: 'https://nclt.gov.in/all-cause-list' },

  // ---- NCLAT: both benches (5 courts across them), auto-fetch ----
  { id: 'nclat-chairperson-court', name: 'NCLAT Principal Bench — Chairperson Court', category: 'NCLAT', tier: 'auto', portalUrl: 'https://nclat.nic.in/daily-cause-list' },
  { id: 'nclat-court-2', name: 'NCLAT Principal Bench — Court-II', category: 'NCLAT', tier: 'auto', portalUrl: 'https://nclat.nic.in/daily-cause-list' },
  { id: 'nclat-court-3', name: 'NCLAT Principal Bench — Court-III', category: 'NCLAT', tier: 'auto', portalUrl: 'https://nclat.nic.in/daily-cause-list' },
  { id: 'nclat-court-4', name: 'NCLAT Principal Bench — Court-IV', category: 'NCLAT', tier: 'auto', portalUrl: 'https://nclat.nic.in/daily-cause-list' },
  { id: 'nclat-chennai', name: 'NCLAT Chennai Bench', category: 'NCLAT', tier: 'auto', portalUrl: 'https://nclat.nic.in/daily-cause-list' },

  // District Courts (700+ nationally, its own project for real auto-fetch coverage — deferred) all
  // share one centralized national portal, the same way DRT does below. Confirmed captcha-gated at
  // the search step ("Enter the Captcha (the 5 alphanumeric characters shown on the screen)") —
  // the advocate selects their own state/district/court complex/court name/date there, solves the
  // captcha, and uploads the result here. One entry covers every district court in the country;
  // no per-court research needed for this tier.
  { id: 'district-courts', name: 'District Courts (all states)', category: 'District Court', tier: 'manual', portalUrl: 'https://services.ecourts.gov.in/ecourtindia_v6/?p=cause_list/index' },

  // ---- All 39 DRT benches share one centralized portal (drt.gov.in — captcha-gated at the
  // search step, confirming tier 2), grouped here under their parent DRAT the way the portal
  // itself does. ----
  { id: 'drt-delhi-1', name: 'DRT-1 Delhi', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-delhi-2', name: 'DRT-2 Delhi', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-delhi-3', name: 'DRT-3 Delhi', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-chandigarh-1', name: 'DRT-1 Chandigarh', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-chandigarh-2', name: 'DRT-2 Chandigarh', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-chandigarh-3', name: 'DRT-3 Chandigarh', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-jaipur', name: 'DRT Jaipur', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },

  { id: 'drt-allahabad', name: 'DRT Allahabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-dehradun', name: 'DRT Dehradun', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-jabalpur', name: 'DRT Jabalpur', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-lucknow', name: 'DRT Lucknow', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-patna', name: 'DRT Patna', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-ranchi', name: 'DRT Ranchi', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },

  { id: 'drt-chennai-1', name: 'DRT-1 Chennai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-chennai-2', name: 'DRT-2 Chennai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-chennai-3', name: 'DRT-3 Chennai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-bangalore-1', name: 'DRT-1 Bangalore', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-bangalore-2', name: 'DRT-2 Bangalore', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-coimbatore', name: 'DRT Coimbatore', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-ernakulam-1', name: 'DRT-1 Ernakulam', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-ernakulam-2', name: 'DRT-2 Ernakulam', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-madurai', name: 'DRT Madurai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },

  { id: 'drt-kolkata-1', name: 'DRT-1 Kolkata', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-kolkata-2', name: 'DRT-2 Kolkata', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-kolkata-3', name: 'DRT-3 Kolkata', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-hyderabad-1', name: 'DRT-1 Hyderabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-hyderabad-2', name: 'DRT-2 Hyderabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-vishakhapatnam', name: 'DRT Vishakhapatnam', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-siliguri', name: 'DRT Siliguri', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-cuttack', name: 'DRT Cuttack', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-guwahati', name: 'DRT Guwahati', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },

  { id: 'drt-mumbai-1', name: 'DRT-1 Mumbai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-mumbai-2', name: 'DRT-2 Mumbai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-mumbai-3', name: 'DRT-3 Mumbai', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-ahmedabad-1', name: 'DRT-1 Ahmedabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-ahmedabad-2', name: 'DRT-2 Ahmedabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-aurangabad', name: 'DRT Aurangabad', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-nagpur', name: 'DRT Nagpur', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
  { id: 'drt-pune', name: 'DRT Pune', category: 'DRT', tier: 'manual', portalUrl: 'https://drt.gov.in' },
];
