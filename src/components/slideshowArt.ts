// Decorative SVG artwork for the landing-page slideshows. Static strings authored in this repo
// (no user input), injected via dangerouslySetInnerHTML by LandingSlideshow. Class names
// (.a / .a-draw / .g / .pn ...) are styled in LandingSlideshow.css.

function coverageDots(): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    const cx = 44 + (i % 9) * 34;
    const cy = 52 + Math.floor(i / 9) * 34;
    const d = (0.3 + i * 0.04).toFixed(2);
    out += `<circle cx="${cx}" cy="${cy}" r="9" class="${i < 28 ? 'g' : 'ut'} a a-pop" style="--d:${d}s"/>`;
  }
  return out;
}

const svg = (inner: string) => `<svg viewBox="0 0 360 300" focusable="false">${inner}</svg>`;

// ---- Slideshow 1: what the platform offers ----
export const offersArt: string[] = [
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
    <g class="a a-inl" style="--d:.3s"><rect class="pn" x="30" y="20" width="300" height="52" rx="6"/><text x="54" y="52">Deadline</text><circle class="ivs" cx="304" cy="46" r="13"/></g>
    <path class="gs a a-draw" d="M297 46l5 5 9-11" pathLength="1" style="--d:.7s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 72V88" pathLength="1" style="--d:.85s;--t:.3s"/>
    <g class="a a-inl" style="--d:.9s"><rect class="pn" x="30" y="88" width="300" height="52" rx="6"/><text x="54" y="120">Jurisdiction</text><circle class="ivs" cx="304" cy="114" r="13"/></g>
    <path class="gs a a-draw" d="M297 114l5 5 9-11" pathLength="1" style="--d:1.3s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 140V156" pathLength="1" style="--d:1.45s;--t:.3s"/>
    <g class="a a-inl" style="--d:1.5s"><rect class="pn" x="30" y="156" width="300" height="52" rx="6"/><text x="54" y="188">Eligibility</text><circle class="ivs" cx="304" cy="182" r="13"/></g>
    <path class="gs a a-draw" d="M297 182l5 5 9-11" pathLength="1" style="--d:1.9s;--t:.4s"/>
    <path class="ln a a-draw" d="M60 208V232" pathLength="1" style="--d:2.05s;--t:.3s"/>
    <g class="a a-pop" style="--d:2.2s"><rect class="g" x="30" y="232" width="300" height="52" rx="6"/><text x="54" y="264" style="fill:#1C2B33;font-weight:600;font-size:17px">Draft</text>
      <path d="M296 258h20M308 250l8 8-8 8" fill="none" stroke="#1C2B33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
  `),
  svg(`
    <g>${coverageDots()}</g>
    <g class="a a-fade" style="--d:1.9s">
      <circle class="g" cx="44" cy="224" r="9"/><text x="64" y="229">28 states</text>
      <circle class="ut" cx="44" cy="260" r="9"/><text x="64" y="265">8 union territories</text>
    </g>
  `),
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
export const howArt: string[] = [
  svg(`
    <path class="ln a a-draw" d="M52 140H308" pathLength="1" style="--d:.2s;--t:1.5s"/>
    <g class="a a-pop" style="--d:.5s"><circle class="nd" cx="52" cy="140" r="17"/><text x="52" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">1</text></g>
    <g class="a a-pop" style="--d:.9s"><circle class="nd" cx="137" cy="140" r="17"/><text x="137" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">2</text></g>
    <g class="a a-pop" style="--d:1.3s"><circle class="nd" cx="223" cy="140" r="17"/><text x="223" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:600">3</text></g>
    <g class="a a-pop" style="--d:1.7s"><circle class="g" cx="308" cy="140" r="17"/><text x="308" y="140" text-anchor="middle" dominant-baseline="central" style="font-weight:700;fill:#1C2B33">4</text></g>
    <text class="sm a a-fade" x="52" y="184" text-anchor="middle" style="--d:.65s">Answer</text>
    <text class="sm a a-fade" x="137" y="184" text-anchor="middle" style="--d:1.05s">Upload</text>
    <text class="sm a a-fade" x="223" y="184" text-anchor="middle" style="--d:1.45s">Check</text>
    <text class="sm a a-fade" x="308" y="184" text-anchor="middle" style="--d:1.85s">Draft</text>
  `),
  svg(`
    <g class="a a-inl" style="--d:.3s"><rect class="pn" x="24" y="20" width="212" height="76" rx="8"/><text class="sm" x="42" y="46">Plain language</text><rect class="mu2" x="42" y="58" width="150" height="6" rx="3"/><rect class="mu" x="42" y="72" width="104" height="6" rx="3"/></g>
    <g class="a a-inr" style="--d:.6s"><rect class="pn" x="124" y="108" width="212" height="76" rx="8"/><text class="sm" x="142" y="134">Legal phrasing</text><rect class="mu2" x="142" y="146" width="176" height="6" rx="3"/><rect class="mu" x="142" y="160" width="150" height="6" rx="3"/></g>
    <path class="ln a a-draw" d="M52 96V204" pathLength="1" style="--d:1s;--t:.6s"/>
    <path class="ln a a-draw" d="M304 184V204" pathLength="1" style="--d:1.2s;--t:.3s"/>
    <path class="ln a a-draw" d="M52 204H304" pathLength="1" style="--d:1.5s;--t:.5s"/>
    <path class="gs a a-draw" d="M178 204V230" pathLength="1" style="--d:2s;--t:.3s"/>
    <g class="a a-pop" style="--d:2.2s"><rect class="pg" x="88" y="230" width="180" height="54" rx="8"/><text x="108" y="262" style="font-size:14px">Same facts captured</text><path class="gs" d="M246 258l5 5 9-11"/></g>
  `),
  svg(`
    <g class="a a-pop" style="--d:.2s"><rect class="pn" x="24" y="14" width="52" height="30" rx="15"/><text x="50" y="34" text-anchor="middle" style="font-size:14px">FIR</text></g>
    <g class="a a-pop" style="--d:.3s"><rect class="pn" x="84" y="14" width="76" height="30" rx="15"/><text x="122" y="34" text-anchor="middle" style="font-size:14px">Notice</text></g>
    <g class="a a-pop" style="--d:.4s"><rect class="pn" x="168" y="14" width="68" height="30" rx="15"/><text x="202" y="34" text-anchor="middle" style="font-size:14px">Order</text></g>
    <g class="a a-pop" style="--d:.5s"><rect class="pn" x="244" y="14" width="92" height="30" rx="15"/><text x="290" y="34" text-anchor="middle" style="font-size:14px">Complaint</text></g>
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
    <g class="a a-fade" style="--d:.5s"><path class="gs" d="M292 36V78" stroke-dasharray="3 4"/><text x="292" y="26" text-anchor="middle" style="fill:#D4AF37;font-size:14px;font-weight:600">Deadline</text></g>
    <g class="a a-pop" style="--d:1.7s"><circle class="iv" cx="238" cy="57" r="8"/><text class="sm" x="238" y="90" text-anchor="middle">Today</text></g>
    <g class="a a-inl" style="--d:2s"><rect class="pn" x="30" y="118" width="300" height="44" rx="6"/><text x="50" y="146">Jurisdiction</text><circle class="ivs" cx="306" cy="140" r="12"/></g>
    <path class="gs a a-draw" d="M300 140l4 4 8-9" pathLength="1" style="--d:2.35s;--t:.35s"/>
    <g class="a a-inl" style="--d:2.5s"><rect class="pn" x="30" y="170" width="300" height="44" rx="6"/><text x="50" y="198">Eligibility</text><circle class="ivs" cx="306" cy="192" r="12"/></g>
    <path class="gs a a-draw" d="M300 192l4 4 8-9" pathLength="1" style="--d:2.85s;--t:.35s"/>
    <g class="a a-inl" style="--d:3s"><rect class="gap" x="30" y="222" width="300" height="44" rx="6"/><text x="50" y="250" style="fill:#D4AF37">Gap flagged</text><circle class="g" cx="306" cy="244" r="12"/><text x="306" y="244" text-anchor="middle" dominant-baseline="central" style="fill:#1C2B33;font-weight:700">!</text></g>
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
