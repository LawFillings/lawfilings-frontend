// Decorative SVG artwork for the landing-page slideshows. Static strings authored in this repo
// (no user input), injected via dangerouslySetInnerHTML by LandingSlideshow. Class names
// (.a / .a-draw / .g / .pn ...) are styled in LandingSlideshow.css.

import { INDIA_MAP } from './indiaMapPaths';

function coverageMap(): string {
  const { width, items } = INDIA_MAP;
  const ox = ((360 - width) / 2).toFixed(1);
  let out = `<g transform="translate(${ox} 6)">`;
  items.forEach((it, i) => {
    const d = (0.15 + i * 0.05).toFixed(2);
    out += `<path class="${it.kind === 'state' ? 'mps' : 'mpu'} a a-fade" style="--d:${d}s" d="${it.d}"/>`;
  });
  // Delhi, Chandigarh and Puducherry are too small to read on their own — ring them.
  for (const it of items) {
    if (it.name === 'NCT of Delhi' || it.name === 'Chandigarh' || it.name === 'Puducherry') {
      out += `<circle class="mpr a a-fade" style="--d:2.1s" cx="${it.cx}" cy="${it.cy}" r="5"/>`;
    }
  }
  return out + '</g>';
}

export interface ArtLabels {
  deadline: string; jurisdiction: string; eligibility: string; draft: string; states28: string;
  unionTerritories8: string; plainLanguage: string; legalPhrasing: string; sameFacts: string; fir: string;
  notice: string; order: string; complaint: string; answer: string; upload: string; check: string;
  today: string; gapFlagged: string;
}

const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const svg = (inner: string, height = 300) => `<svg viewBox="0 0 360 ${height}" focusable="false">${inner}</svg>`;

// ---- Slideshow 1: what the platform offers ----
export const offersArt = (a: ArtLabels): string[] => [
  svg(`
    <path class="gs a a-draw" d="M20 262H340" pathLength="1" style="--d:.2s;--t:1s"/>
    <g class="a a-rise" style="--d:.45s"><rect class="g" x="36" y="66" width="38" height="196" rx="2"/><rect class="nv" x="43" y="88" width="24" height="3"/><rect class="nv" x="43" y="96" width="24" height="3"/></g>
    <g class="a a-rise" style="--d:.6s"><rect class="bk-a" x="80" y="112" width="22" height="150" rx="2"/><rect class="g" x="83" y="124" width="16" height="3"/></g>
    <g class="a a-rise" style="--d:.67s"><rect class="bk-b" x="106" y="144" width="18" height="118" rx="2"/><rect class="g" x="109" y="156" width="12" height="3"/></g>
    <g class="a a-rise" style="--d:.74s"><rect class="bk-c" x="128" y="90" width="26" height="172" rx="2"/><rect class="g" x="131" y="102" width="20" height="3"/></g>
    <g class="a a-rise" style="--d:.81s"><rect class="bk-a" x="158" y="126" width="20" height="136" rx="2"/><rect class="g" x="161" y="138" width="14" height="3"/></g>
    <g class="a a-rise" style="--d:.88s"><rect class="bk-b" x="182" y="102" width="24" height="160" rx="2"/><rect class="g" x="185" y="114" width="18" height="3"/></g>
    <g class="a a-rise" style="--d:.95s"><rect class="bk-a" x="210" y="154" width="18" height="108" rx="2"/><rect class="g" x="213" y="166" width="12" height="3"/></g>
    <g class="a a-rise" style="--d:1.02s"><rect class="bk-c" x="232" y="114" width="26" height="148" rx="2"/><rect class="g" x="235" y="126" width="20" height="3"/></g>
    <g class="a a-rise" style="--d:1.09s"><rect class="bk-b" x="262" y="86" width="20" height="176" rx="2"/><rect class="g" x="265" y="98" width="14" height="3"/></g>
    <g class="a a-rise" style="--d:1.16s"><rect class="bk-a" x="286" y="134" width="24" height="128" rx="2"/><rect class="g" x="289" y="146" width="18" height="3"/></g>
    <g class="a a-rise" style="--d:1.23s"><rect class="bk-b" x="314" y="166" width="20" height="96" rx="2"/><rect class="g" x="317" y="178" width="14" height="3"/></g>
  `),
  svg(`
    <g class="a a-inl" style="--d:.3s"><rect class="pn" x="30" y="20" width="300" height="52" rx="6"/><text x="54" y="52">${e(a.deadline)}</text><circle class="ivs" cx="304" cy="46" r="13"/></g>
    <path class="gs a a-draw" d="M297 46l5 5 9-11" pathLength="1" style="--d:.7s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 72V88" pathLength="1" style="--d:.85s;--t:.3s"/>
    <g class="a a-inl" style="--d:.9s"><rect class="pn" x="30" y="88" width="300" height="52" rx="6"/><text x="54" y="120">${e(a.jurisdiction)}</text><circle class="ivs" cx="304" cy="114" r="13"/></g>
    <path class="gs a a-draw" d="M297 114l5 5 9-11" pathLength="1" style="--d:1.3s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 140V156" pathLength="1" style="--d:1.45s;--t:.3s"/>
    <g class="a a-inl" style="--d:1.5s"><rect class="pn" x="30" y="156" width="300" height="52" rx="6"/><text x="54" y="188">${e(a.eligibility)}</text><circle class="ivs" cx="304" cy="182" r="13"/></g>
    <path class="gs a a-draw" d="M297 182l5 5 9-11" pathLength="1" style="--d:1.9s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 208V232" pathLength="1" style="--d:2.05s;--t:.3s"/>
    <g class="a a-pop" style="--d:2.2s"><rect class="g" x="30" y="232" width="300" height="52" rx="6"/><text x="54" y="264" style="fill:#1C2B33;font-weight:600;font-size:17px">${e(a.draft)}</text>
      <path d="M296 258h20M308 250l8 8-8 8" fill="none" stroke="#1C2B33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
  `),
  svg(`
    ${coverageMap()}
    <g class="a a-fade" style="--d:2.3s">
      <circle class="g" cx="88" cy="290" r="8"/><text x="106" y="295">${e(a.states28)}</text>
      <circle class="mpu" cx="88" cy="316" r="8"/><text x="106" y="321">${e(a.unionTerritories8)}</text>
    </g>
  `, 336),
  svg(`
    <path class="ln a a-draw" d="M64 24V260" pathLength="1" style="--d:.2s;--t:1.6s"/>
    <circle class="nd a a-pop" cx="64" cy="44" r="8" style="--d:.5s"/>
    <g class="a a-inr" style="--d:.55s"><rect class="mu2" x="96" y="30" width="168" height="8" rx="4"/><rect class="mu" x="96" y="46" width="112" height="6" rx="3"/></g>
    <circle class="nd a a-pop" cx="64" cy="104" r="8" style="--d:1.2s"/>
    <g class="a a-inr" style="--d:1.25s"><rect class="mu2" x="96" y="90" width="140" height="8" rx="4"/><rect class="mu" x="96" y="106" width="150" height="6" rx="3"/></g>
    <circle class="nd a a-pop" cx="64" cy="164" r="8" style="--d:1.9s"/>
    <g class="a a-inr" style="--d:1.95s"><rect class="mu2" x="96" y="150" width="188" height="8" rx="4"/><rect class="mu" x="96" y="166" width="96" height="6" rx="3"/></g>
    <circle class="g a a-pop" cx="64" cy="224" r="8" style="--d:2.6s"/>
    <g class="a a-inr" style="--d:2.65s"><rect class="mu2" x="96" y="210" width="120" height="8" rx="4"/><rect class="mu" x="96" y="226" width="132" height="6" rx="3"/></g>
    <g class="a a-pop" style="--d:3.4s"><circle class="dash" cx="64" cy="274" r="10"/><path class="gs" d="M64 269V279M59 274H69"/></g>
  `),
  svg(`
    <rect class="iv a a-fade" x="84" y="14" width="192" height="272" rx="4" style="--d:.15s"/>
    <rect class="ph a a-gx" x="110" y="38" width="104" height="9" rx="2" style="--d:.4s"/>
    <rect class="ph a a-gx" x="110" y="68" width="52" height="6" rx="2" style="--d:.6s"/>
    <rect class="pl a a-gx" x="110" y="82" width="150" height="5" rx="2" style="--d:.75s"/>
    <rect class="pl a a-gx" x="110" y="94" width="150" height="5" rx="2" style="--d:.85s"/>
    <rect class="pl a a-gx" x="110" y="106" width="104" height="5" rx="2" style="--d:.95s"/>
    <rect class="ph a a-gx" x="110" y="134" width="52" height="6" rx="2" style="--d:1.35s"/>
    <rect class="pl a a-gx" x="110" y="148" width="150" height="5" rx="2" style="--d:1.5s"/>
    <rect class="pl a a-gx" x="110" y="160" width="150" height="5" rx="2" style="--d:1.6s"/>
    <rect class="pl a a-gx" x="110" y="172" width="104" height="5" rx="2" style="--d:1.7s"/>
    <rect class="ph a a-gx" x="110" y="200" width="52" height="6" rx="2" style="--d:2.1s"/>
    <rect class="pl a a-gx" x="110" y="214" width="150" height="5" rx="2" style="--d:2.25s"/>
    <rect class="pl a a-gx" x="110" y="226" width="150" height="5" rx="2" style="--d:2.35s"/>
    <rect class="pl a a-gx" x="110" y="238" width="104" height="5" rx="2" style="--d:2.45s"/>
    <path class="nvs a a-draw" d="M110 268H176" pathLength="1" style="--d:2.7s;--t:.5s"/>
    <g class="a a-pop" style="--d:3.1s"><rect class="g" x="228" y="238" width="68" height="32" rx="5"/><text x="262" y="259" text-anchor="middle" style="fill:#1C2B33;font-weight:700">PDF</text></g>
  `),
];

// ---- Slideshow 2: how it works (intro + 4 steps) ----
export const howArt = (a: ArtLabels): string[] => [
  svg(`
    <path class="ln a a-draw" d="M52 140H308" pathLength="1" style="--d:.2s;--t:1.5s"/>
    <g class="a a-pop" style="--d:.5s"><circle class="nd" cx="52" cy="140" r="17"/><text x="52" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">1</text></g>
    <g class="a a-pop" style="--d:.9s"><circle class="nd" cx="137" cy="140" r="17"/><text x="137" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">2</text></g>
    <g class="a a-pop" style="--d:1.3s"><circle class="nd" cx="223" cy="140" r="17"/><text x="223" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">3</text></g>
    <g class="a a-pop" style="--d:1.7s"><circle class="g" cx="308" cy="140" r="17"/><text x="308" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:700;fill:#1C2B33">4</text></g>
    <text class="sm a a-fade" x="52" y="184" text-anchor="middle" style="--d:.65s">${e(a.answer)}</text>
    <text class="sm a a-fade" x="137" y="184" text-anchor="middle" style="--d:1.05s">${e(a.upload)}</text>
    <text class="sm a a-fade" x="223" y="184" text-anchor="middle" style="--d:1.45s">${e(a.check)}</text>
    <text class="sm a a-fade" x="308" y="184" text-anchor="middle" style="--d:1.85s">${e(a.draft)}</text>
  `),
  svg(`
    <g class="a a-inl" style="--d:.3s"><rect class="pn" x="24" y="20" width="212" height="76" rx="8"/><text class="sm" x="42" y="46">${e(a.plainLanguage)}</text><rect class="mu2" x="42" y="58" width="150" height="6" rx="3"/><rect class="mu" x="42" y="72" width="104" height="6" rx="3"/></g>
    <g class="a a-inr" style="--d:.6s"><rect class="pn" x="124" y="108" width="212" height="76" rx="8"/><text class="sm" x="142" y="134">${e(a.legalPhrasing)}</text><rect class="mu2" x="142" y="146" width="176" height="6" rx="3"/><rect class="mu" x="142" y="160" width="150" height="6" rx="3"/></g>
    <path class="ln a a-draw" d="M52 96V204" pathLength="1" style="--d:1s;--t:.6s"/>
    <path class="ln a a-draw" d="M304 184V204" pathLength="1" style="--d:1.2s;--t:.3s"/>
    <path class="ln a a-draw" d="M52 204H304" pathLength="1" style="--d:1.5s;--t:.5s"/>
    <path class="gs a a-draw" d="M178 204V230" pathLength="1" style="--d:2s;--t:.3s"/>
    <g class="a a-pop" style="--d:2.2s"><rect class="pg" x="88" y="230" width="180" height="54" rx="8"/><text x="108" y="262" style="font-size:14px">${e(a.sameFacts)}</text><path class="gs" d="M246 258l5 5 9-11"/></g>
  `),
  svg(`
    <g class="a a-pop" style="--d:.2s"><rect class="pn" x="24" y="14" width="52" height="30" rx="15"/><text x="50" y="34" text-anchor="middle" style="font-size:14px">${e(a.fir)}</text></g>
    <g class="a a-pop" style="--d:.3s"><rect class="pn" x="84" y="14" width="76" height="30" rx="15"/><text x="122" y="34" text-anchor="middle" style="font-size:14px">${e(a.notice)}</text></g>
    <g class="a a-pop" style="--d:.4s"><rect class="pn" x="168" y="14" width="68" height="30" rx="15"/><text x="202" y="34" text-anchor="middle" style="font-size:14px">${e(a.order)}</text></g>
    <g class="a a-pop" style="--d:.5s"><rect class="pn" x="244" y="14" width="92" height="30" rx="15"/><text x="290" y="34" text-anchor="middle" style="font-size:14px">${e(a.complaint)}</text></g>
    <path class="gs a a-draw" d="M180 54V92" pathLength="1" style="--d:.9s;--t:.5s"/>
    <path class="gs a a-draw" d="M172 84l8 8 8-8" pathLength="1" style="--d:1.3s;--t:.3s"/>
    <rect class="pn a a-fade" x="40" y="104" width="280" height="180" rx="8" style="--d:1.2s"/>
    <rect class="mu a a-fade" x="60" y="124" width="64" height="6" rx="3" style="--d:1.3s"/>
    <rect class="ivs a a-fade" x="60" y="136" width="240" height="16" rx="4" style="--d:1.3s"/>
    <rect class="gf a a-gx" x="62" y="138" width="196" height="12" rx="3" style="--d:1.5s;--t:.7s"/>
    <rect class="mu a a-fade" x="60" y="164" width="80" height="6" rx="3" style="--d:1.3s"/>
    <rect class="ivs a a-fade" x="60" y="176" width="240" height="16" rx="4" style="--d:1.3s"/>
    <rect class="gf a a-gx" x="62" y="178" width="150" height="12" rx="3" style="--d:2.1s;--t:.7s"/>
    <rect class="mu a a-fade" x="60" y="204" width="56" height="6" rx="3" style="--d:1.3s"/>
    <rect class="ivs a a-fade" x="60" y="216" width="240" height="16" rx="4" style="--d:1.3s"/>
    <rect class="gf a a-gx" x="62" y="218" width="214" height="12" rx="3" style="--d:2.7s;--t:.7s"/>
    <rect class="mu a a-fade" x="60" y="244" width="72" height="6" rx="3" style="--d:1.3s"/>
    <rect class="ivd a a-fade" x="60" y="256" width="240" height="16" rx="4" style="--d:1.3s"/>
  `),
  svg(`
    <rect class="tk a a-fade" x="30" y="52" width="300" height="10" rx="5" style="--d:.1s"/>
    <rect class="gf a a-gx" x="30" y="52" width="208" height="10" rx="5" style="--d:.3s;--t:1.5s"/>
    <g class="a a-fade" style="--d:.5s"><path class="gs" d="M292 36V78" stroke-dasharray="3 4"/><text x="292" y="26" text-anchor="middle" style="fill:#D4AF37;font-size:14px;font-weight:600">${e(a.deadline)}</text></g>
    <g class="a a-pop" style="--d:1.7s"><circle class="iv" cx="238" cy="57" r="8"/><text class="sm" x="238" y="90" text-anchor="middle">${e(a.today)}</text></g>
    <g class="a a-inl" style="--d:2s"><rect class="pn" x="30" y="118" width="300" height="44" rx="6"/><text x="50" y="146">${e(a.jurisdiction)}</text><circle class="ivs" cx="306" cy="140" r="12"/></g>
    <path class="gs a a-draw" d="M300 140l4 4 8-9" pathLength="1" style="--d:2.35s;--t:.35s"/>
    <g class="a a-inl" style="--d:2.5s"><rect class="pn" x="30" y="170" width="300" height="44" rx="6"/><text x="50" y="198">${e(a.eligibility)}</text><circle class="ivs" cx="306" cy="192" r="12"/></g>
    <path class="gs a a-draw" d="M300 192l4 4 8-9" pathLength="1" style="--d:2.85s;--t:.35s"/>
    <g class="a a-inl" style="--d:3s"><rect class="gap" x="30" y="222" width="300" height="44" rx="6"/><text x="50" y="250" style="fill:#D4AF37">${e(a.gapFlagged)}</text><circle class="g" cx="306" cy="244" r="12"/><text x="306" y="244" text-anchor="middle" dominant-baseline="central" style="fill:#1C2B33;font-weight:700">!</text></g>
  `),
  svg(`
    <rect class="iv a a-fade" x="30" y="14" width="200" height="272" rx="4" style="--d:.15s"/>
    <rect class="ph a a-gx" x="80" y="38" width="100" height="9" rx="2" style="--d:.4s"/>
    <path class="nvs a a-draw" d="M56 62H204" pathLength="1" style="--d:.6s;--t:.5s"/>
    <rect class="pl a a-gx" x="56" y="80" width="148" height="5" rx="2" style="--d:.9s"/>
    <rect class="pl a a-gx" x="56" y="93" width="148" height="5" rx="2" style="--d:1s"/>
    <rect class="pl a a-gx" x="56" y="106" width="96" height="5" rx="2" style="--d:1.1s"/>
    <rect class="pl a a-gx" x="56" y="138" width="148" height="5" rx="2" style="--d:1.5s"/>
    <rect class="pl a a-gx" x="56" y="151" width="148" height="5" rx="2" style="--d:1.6s"/>
    <rect class="pl a a-gx" x="56" y="164" width="96" height="5" rx="2" style="--d:1.7s"/>
    <rect class="pl a a-gx" x="56" y="196" width="148" height="5" rx="2" style="--d:2.1s"/>
    <rect class="pl a a-gx" x="56" y="209" width="148" height="5" rx="2" style="--d:2.2s"/>
    <rect class="pl a a-gx" x="56" y="222" width="96" height="5" rx="2" style="--d:2.3s"/>
    <path class="nvs a a-draw" d="M56 262H120" pathLength="1" style="--d:2.6s;--t:.5s"/>
    <circle class="gs a a-pop" cx="190" cy="252" r="13" style="--d:2.8s"/>
    <g class="a a-inl" style="--d:3s"><rect class="g" x="244" y="96" width="76" height="34" rx="5"/><text x="282" y="118" text-anchor="middle" style="fill:#1C2B33;font-weight:700">PDF</text></g>
    <g class="a a-inl" style="--d:3.3s"><rect class="pg" x="244" y="142" width="76" height="34" rx="5"/><text x="282" y="164" text-anchor="middle" style="font-weight:600">Word</text></g>
  `),
];

// ---- Slideshow 3: "Built for" (intro + 4 audiences) — text-free, so no translation labels needed ----
const ICON = {
  briefcase: '<rect x="3" y="9" width="22" height="15" rx="2"/><path d="M10 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 16h22"/>',
  person: '<circle cx="14" cy="9" r="5"/><path d="M4 26c0-5.5 4.5-9 10-9s10 3.5 10 9"/>',
  building: '<rect x="5" y="3" width="18" height="22" rx="1"/><path d="M10 9h2M16 9h2M10 14h2M16 14h2M12 25v-5h4v5"/>',
  cap: '<path d="M2 11 14 5l12 6-12 6-12-6Z"/><path d="M7 14v6c0 2 3.2 3.5 7 3.5s7-1.5 7-3.5v-6M26 11v8"/>',
};

export const builtForArt: string[] = [
  svg(`
    <path class="ln a a-draw" d="M52 150H308" pathLength="1" style="--d:.2s;--t:1.4s"/>
    <g class="a a-pop" style="--d:.5s"><circle class="nd" cx="52" cy="150" r="30"/><g class="gs" transform="translate(38 136)">${ICON.briefcase}</g></g>
    <g class="a a-pop" style="--d:.9s"><circle class="nd" cx="137" cy="150" r="30"/><g class="gs" transform="translate(123 136)">${ICON.person}</g></g>
    <g class="a a-pop" style="--d:1.3s"><circle class="nd" cx="223" cy="150" r="30"/><g class="gs" transform="translate(209 136)">${ICON.building}</g></g>
    <g class="a a-pop" style="--d:1.7s"><circle class="g" cx="308" cy="150" r="30"/><g transform="translate(294 136)" fill="none" stroke="#1C2B33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICON.cap}</g></g>
  `),
  // Advocates: scales of justice + a filing with the cited provision highlighted
  svg(`
    <g class="gs">
      <path class="a a-draw" d="M100 40V250M70 262H130" pathLength="1" style="--d:.2s;--t:.8s"/>
      <path class="a a-draw" d="M44 66H156" pathLength="1" style="--d:.6s;--t:.6s"/>
      <path class="a a-draw" d="M44 66l-22 56a26 26 0 0 0 44 0Z" pathLength="1" style="--d:.9s;--t:.7s"/>
      <path class="a a-draw" d="M156 66l-22 56a26 26 0 0 0 44 0Z" pathLength="1" style="--d:1.1s;--t:.7s"/>
    </g>
    <g class="a a-inr" style="--d:1.2s"><rect class="iv" x="200" y="60" width="130" height="176" rx="4"/>
      <rect class="ph" x="216" y="80" width="70" height="8" rx="2"/>
      <rect class="gf" x="216" y="106" width="98" height="12" rx="3"/>
      <rect class="pl" x="216" y="130" width="98" height="5" rx="2"/><rect class="pl" x="216" y="143" width="98" height="5" rx="2"/><rect class="pl" x="216" y="156" width="64" height="5" rx="2"/>
      <rect class="pl" x="216" y="180" width="98" height="5" rx="2"/><rect class="pl" x="216" y="193" width="80" height="5" rx="2"/></g>
  `),
  // Self-represented: a person, plain questions, one clean form
  svg(`
    <g class="a a-pop" style="--d:.2s"><g class="gs"><circle cx="76" cy="120" r="22"/><path d="M34 214c0-30 19-46 42-46s42 16 42 46"/></g></g>
    <g class="a a-pop" style="--d:.7s"><rect class="pn" x="126" y="66" width="70" height="40" rx="10"/><text x="161" y="94" text-anchor="middle" style="font-size:22px;fill:#D4AF37;font-weight:600">?</text></g>
    <g class="a a-pop" style="--d:1.1s"><rect class="pn" x="70" y="30" width="54" height="34" rx="10"/><text x="97" y="55" text-anchor="middle" style="font-size:20px;fill:#F3EEE2">?</text></g>
    <path class="gs a a-draw" d="M120 196H196" pathLength="1" style="--d:1.5s;--t:.5s"/>
    <path class="gs a a-draw" d="M186 186l10 10-10 10" pathLength="1" style="--d:1.9s;--t:.3s"/>
    <g class="a a-inr" style="--d:2s"><rect class="iv" x="220" y="120" width="106" height="130" rx="4"/>
      <rect class="ph" x="234" y="136" width="52" height="7" rx="2"/>
      <rect class="pl" x="234" y="156" width="78" height="5" rx="2"/><rect class="pl" x="234" y="169" width="78" height="5" rx="2"/><rect class="pl" x="234" y="182" width="52" height="5" rx="2"/>
      <circle class="g" cx="304" cy="232" r="11"/><path d="M298 232l4 4 8-9" fill="none" stroke="#1C2B33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
  `),
  // Corporates: an organisation, and dues coming back
  svg(`
    <g class="gs a a-pop" style="--d:.2s"><rect x="40" y="70" width="110" height="180" rx="3"/><path d="M62 100h14M100 100h14M62 132h14M100 132h14M62 164h14M100 164h14M84 250v-46h24v46"/></g>
    <path class="gs a a-draw" d="M300 92c-34-46-110-46-150 0" pathLength="1" style="--d:1s;--t:1s"/>
    <path class="gs a a-draw" d="M162 92l-14 2 4-14" pathLength="1" style="--d:2s;--t:.3s"/>
    <g class="a a-pop" style="--d:1.4s"><circle class="g" cx="300" cy="150" r="30"/><text x="300" y="161" text-anchor="middle" style="font-size:30px;fill:#1C2B33;font-weight:700">₹</text></g>
    <g class="a a-inr" style="--d:2.2s"><rect class="pn" x="196" y="200" width="134" height="48" rx="8"/><rect class="mu2" x="214" y="216" width="70" height="7" rx="3"/><rect class="mu" x="214" y="230" width="98" height="6" rx="3"/></g>
  `),
  // Students: sourced text and a study aid
  svg(`
    <g class="a a-pop" style="--d:.2s"><g class="gs"><path d="M60 92 180 40l120 52-120 52Z"/><path d="M104 118v58c0 16 34 30 76 30s76-14 76-30v-58M300 92v70"/></g></g>
    <g class="a a-fade" style="--d:1s"><path class="iv" d="M60 230c40-14 80-14 120 0v46c-40-14-80-14-120 0Z"/><path class="iv" d="M180 230c40-14 80-14 120 0v46c-40-14-80-14-120 0Z"/>
      <rect class="pl" x="78" y="240" width="76" height="4" rx="2"/><rect class="pl" x="78" y="251" width="60" height="4" rx="2"/>
      <rect class="gf" x="200" y="240" width="76" height="6" rx="3"/><rect class="pl" x="200" y="252" width="60" height="4" rx="2"/></g>
  `),
];
