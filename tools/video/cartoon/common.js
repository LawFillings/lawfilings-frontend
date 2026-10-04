// ---------- tiny animation helpers ----------
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIO = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeBack = (x) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
function tf(id, o = {}) {
  const el = $(id); if (!el) { console.warn('missing', id); return; }
  const { x = 0, y = 0, s = 1, r = 0, o: op = 1, sx, sy } = o;
  el.setAttribute('transform', `translate(${x} ${y}) rotate(${r}) scale(${sx ?? s} ${sy ?? s})`);
  el.style.opacity = op;
}
// pop-in: scale from 0 with overshoot starting at time a over d seconds
const pop = (t, a, d = 0.5) => easeBack(seg(t, a, a + d));
const fade = (t, a, d = 0.4) => seg(t, a, a + d);

// ---------- builders (return SVG markup strings) ----------
const MOODS = {
  sad: 'M-15 26 Q0 12 15 26',
  neutral: 'M-12 22 L12 22',
  happy: 'M-17 14 Q0 36 17 14 Z',
  talk: 'M-12 16 Q0 38 12 16 Z',
  angry: 'M-14 26 Q0 14 14 26',
};
function person(id, o) {
  const { skin = '#e9b98f', hair = '#2b1d16', shirt = '#3b6ea5', coat = false, glasses = false, mustache = false, longHair = false, apron = false, bindi = false, male = false, beard = false, tie = false } = o;
  const torso = coat ? '#1d1f27' : shirt;
  return `<g id="${id}">
    <g id="${id}-body">
      <path d="${male ? 'M-72 0 L-68 -86 Q-64 -114 -26 -118 L26 -118 Q64 -114 68 -86 L72 0 Z' : 'M-64 0 L-60 -85 Q-56 -114 -22 -118 L22 -118 Q56 -114 60 -85 L64 0 Z'}" fill="${torso}"/>
      ${tie && !coat ? '<path d="M-24 -118 L0 -94 L24 -118 Z" fill="#fff"/><path d="M-7 -110 L7 -110 L11 -66 L0 -54 L-11 -66 Z" fill="#a83232"/><path d="M-8 -112 L8 -112 L5 -102 L-5 -102 Z" fill="#8a2727"/>' : ''}
      ${coat ? `<path d="M-20 -118 L0 -60 L20 -118 Z" fill="#f4f4f4"/><path d="M-6 -112 L0 -100 L6 -112 Z" fill="#fff"/><rect x="-5" y="-108" width="4" height="14" fill="#fff"/><rect x="1" y="-108" width="4" height="14" fill="#fff"/><path d="M-22 -118 L-8 -50 L-30 -20 L-40 -110 Z" fill="#14151b"/><path d="M22 -118 L8 -50 L30 -20 L40 -110 Z" fill="#14151b"/>` : ''}
      ${apron ? `<path d="M-40 -110 L-40 0 L40 0 L40 -110 Z" fill="#e9e1cf" opacity="0.95"/>` : ''}
      <rect x="-12" y="-130" width="24" height="18" fill="${skin}"/>
    </g>
    <line id="${id}-aL" x1="-56" y1="-96" x2="-70" y2="-30" stroke="${torso}" stroke-width="26" stroke-linecap="round"/>
    <line id="${id}-aR" x1="56" y1="-96" x2="70" y2="-30" stroke="${torso}" stroke-width="26" stroke-linecap="round"/>
    <circle id="${id}-hL" cx="-70" cy="-30" r="13" fill="${skin}"/>
    <circle id="${id}-hR" cx="70" cy="-30" r="13" fill="${skin}"/>
    <g id="${id}-head" transform="translate(0 -168)">
      ${longHair ? `<path d="M-52 -4 Q-58 -64 0 -66 Q58 -64 52 -4 L56 50 L-56 50 Z" fill="${hair}"/>` : ''}
      <circle r="47" fill="${skin}"/>
      ${longHair
        ? `<path d="M-48 -10 Q-40 -58 0 -58 Q40 -58 48 -10 Q20 -34 -4 -30 Q-30 -26 -48 -10 Z" fill="${hair}"/>`
        : male
          ? `<path d="M-49 -4 Q-54 -66 0 -64 Q54 -66 49 -4 Q44 -40 26 -44 Q2 -34 -24 -44 Q-44 -40 -49 -4 Z" fill="${hair}"/><path d="M-50 -8 L-40 -8 L-42 22 L-47 16 Z" fill="${hair}"/><path d="M50 -8 L40 -8 L42 22 L47 16 Z" fill="${hair}"/>`
          : `<path d="M-47 -8 Q-50 -56 0 -56 Q50 -56 47 -8 Q38 -36 0 -36 Q-38 -36 -47 -8 Z" fill="${hair}"/>`}
      ${beard ? `<path d="M-47 8 Q-50 60 0 66 Q50 60 47 8 Q38 46 0 48 Q-38 46 -47 8 Z" fill="${hair}"/>` : ''}
      ${bindi ? '<circle cx="0" cy="-20" r="3.5" fill="#d33"/>' : ''}
      <circle id="${id}-eL" cx="-17" cy="-6" r="6.5" fill="#1a1a1a"/><circle id="${id}-eR" cx="17" cy="-6" r="6.5" fill="#1a1a1a"/>
      <circle cx="-15" cy="-8" r="2" fill="#fff"/><circle cx="19" cy="-8" r="2" fill="#fff"/>
      <line id="${id}-bL" x1="-27" y1="-20" x2="-9" y2="-20" stroke="${hair}" stroke-width="${male ? 8 : 4.5}" stroke-linecap="round"/>
      <line id="${id}-bR" x1="9" y1="-20" x2="27" y2="-20" stroke="${hair}" stroke-width="${male ? 8 : 4.5}" stroke-linecap="round"/>
      ${glasses ? '<circle cx="-17" cy="-6" r="13" fill="none" stroke="#222" stroke-width="3"/><circle cx="17" cy="-6" r="13" fill="none" stroke="#222" stroke-width="3"/><line x1="-4" y1="-6" x2="4" y2="-6" stroke="#222" stroke-width="3"/>' : ''}
      ${mustache ? '<path d="M-20 14 Q-10 6 0 12 Q10 6 20 14 Q10 20 0 15 Q-10 20 -20 14 Z" fill="#2b1d16"/>' : ''}
      <path id="${id}-mouth" d="${MOODS.neutral}" transform="translate(0 ${mustache ? 14 : 8})" fill="#a33" stroke="#7b2020" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="-30" cy="12" rx="8" ry="5" fill="#e07a7a" opacity=".35"/><ellipse cx="30" cy="12" rx="8" ry="5" fill="#e07a7a" opacity=".35"/>
    </g>
  </g>`;
}
function mood(id, m, blink = false) {
  const p = $(id + '-mouth'); p.setAttribute('d', MOODS[m] || MOODS.neutral);
  p.setAttribute('fill', m === 'happy' || m === 'talk' ? '#a33' : 'none');
  const ang = { sad: [-14, 14], angry: [16, -16], happy: [-6, 6], neutral: [0, 0], talk: [-4, 4] }[m] || [0, 0];
  $(id + '-bL').setAttribute('transform', `rotate(${ang[0]} -18 -20)`);
  $(id + '-bR').setAttribute('transform', `rotate(${ang[1]} 18 -20)`);
  const ry = blink ? 0.15 : 1;
  for (const e of ['eL', 'eR']) $(id + '-' + e).setAttribute('transform', `translate(0 ${blink ? -6 : 0}) scale(1 ${ry})`);
}
// place an arm: shoulder is fixed, hand moves
function arm(id, side, hx, hy) {
  const sx = side === 'L' ? -56 : 56;
  const a = $(`${id}-a${side}`); a.setAttribute('x2', hx); a.setAttribute('y2', hy);
  const h = $(`${id}-h${side}`); h.setAttribute('cx', hx); h.setAttribute('cy', hy);
}
function headTilt(id, dx, dy, r) { $(id + '-head').setAttribute('transform', `translate(${dx} ${-168 + dy}) rotate(${r})`); }

function paper(id, w = 70, h = 90, color = '#fff', lines = 5, accent = '#3b6ea5') {
  let ls = '';
  for (let i = 0; i < lines; i++) ls += `<rect x="${-w / 2 + 8}" y="${-h / 2 + 14 + i * ((h - 26) / lines)}" width="${(i === 0 ? 0.5 : 0.78 + (i % 2) * 0.1) * (w - 16)}" height="4" rx="2" fill="${i === 0 ? accent : '#b8c2cf'}"/>`;
  return `<g id="${id}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="#c7cfdb" stroke-width="2" filter="url(#shadow)"/>${ls}</g>`;
}
function bubble(id, text, w, h, fill = '#fff', stroke = '#14273f', tail = 'left', size = 24, color = '#14273f') {
  const tailPath = tail === 'left' ? `M${-w / 2 + 28} ${h / 2 - 2} L${-w / 2 - 6} ${h / 2 + 30} L${-w / 2 + 62} ${h / 2 - 2} Z` : tail === 'right' ? `M${w / 2 - 28} ${h / 2 - 2} L${w / 2 + 6} ${h / 2 + 30} L${w / 2 - 62} ${h / 2 - 2} Z` : '';
  return `<g id="${id}"><path d="${tailPath}" fill="${fill}" stroke="${stroke}" stroke-width="3"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
  <path d="${tailPath}" fill="${fill}" stroke="none" transform="translate(0 -1)"/>
  <text x="0" y="${size * 0.35}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}">${text}</text></g>`;
}
function chip(id, text, w, fill, color = '#fff', size = 22) {
  return `<g id="${id}"><rect x="${-w / 2}" y="-24" width="${w}" height="48" rx="24" fill="${fill}" filter="url(#shadow)"/><text x="0" y="${size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}">${text}</text></g>`;
}
// The site's own mark (src/components/BrandMark.tsx), same geometry and fixed brand colours. `px` is
// the rendered diameter, used for the same small-size stroke/colour boosts the component applies;
// the group is centred on the origin at 88 units across (the navy disc), scale it with tf().
function logo(id, px = 150) {
  const NAVY = '#14273F', GOLD = '#D4AF37', SOFT = '#E8CC6E';
  const k = Math.min(1.6, Math.max(1, 150 / px));
  const sc = px < 100 ? SOFT : GOLD;
  const sw = (n) => (n * k).toFixed(2);
  let sheets = '';
  const ys = [121, 116.5, 112, 107.5, 103, 98.5], rot = [0, 1.5, 3, 4.5, 6, 8];
  ys.forEach((y, i) => { sheets += `<rect x="135" y="${y}" width="50" height="4" rx="0.8" fill="${SOFT}" stroke="${sc}" stroke-width="${sw(0.5)}"${rot[i] ? ` transform="rotate(${rot[i]} 160 ${y + 2})"` : ''}/>`; });
  return `<g id="${id}"><g transform="scale(0.4681) translate(-120 -120)">
    <circle cx="120" cy="120" r="94" fill="${NAVY}"/>
    <circle cx="120" cy="120" r="99" fill="none" stroke="${sc}" stroke-width="${sw(1.5)}"/>
    <circle cx="120" cy="120" r="90" fill="none" stroke="${sc}" stroke-width="${sw(1)}" opacity="0.75"/>
    <g stroke="${sc}" stroke-linecap="round">
      <line x1="72" y1="125" x2="112" y2="125" stroke-width="${sw(3)}"/><line x1="92" y1="125" x2="92" y2="70" stroke-width="${sw(3)}"/>
      <line x1="62" y1="70" x2="122" y2="70" stroke-width="${sw(2)}"/>
      <line x1="62" y1="70" x2="55" y2="110" stroke-width="${sw(1.8)}"/><line x1="62" y1="70" x2="69" y2="110" stroke-width="${sw(1.8)}"/>
      <line x1="122" y1="70" x2="115" y2="110" stroke-width="${sw(1.8)}"/><line x1="122" y1="70" x2="129" y2="110" stroke-width="${sw(1.8)}"/>
    </g>
    <path d="M55 110 a7 7 0 0 0 14 0" fill="none" stroke="${sc}" stroke-width="${sw(2.2)}"/><path d="M115 110 a7 7 0 0 0 14 0" fill="none" stroke="${sc}" stroke-width="${sw(2.2)}"/>
    <circle cx="92" cy="70" r="${sw(2.6)}" fill="${SOFT}"/>
    <g>${sheets}</g></g></g>`;
}
function washer(id) {
  return `<g id="${id}">
    <rect x="-90" y="-190" width="180" height="200" rx="14" fill="#f4f6f9" stroke="#b9c3d1" stroke-width="4" filter="url(#shadow)"/>
    <rect x="-90" y="-190" width="180" height="42" rx="14" fill="#dfe6ee"/>
    <circle cx="-56" cy="-169" r="9" fill="#9aa6b6"/><circle id="${id}-led" cx="62" cy="-169" r="9" fill="#e23b3b"/>
    <rect x="-34" y="-176" width="64" height="14" rx="4" fill="#1f2a3a"/><text x="-2" y="-165" text-anchor="middle" font-size="12" font-weight="800" fill="#ff5555">ERR</text>
    <circle cx="0" cy="-60" r="62" fill="#c8d3e0" stroke="#8d9bb0" stroke-width="6"/>
    <circle cx="0" cy="-60" r="46" fill="#5a6b83"/><circle cx="0" cy="-60" r="46" fill="#7e90a8" opacity=".5"/>
    <path d="M-30 -80 Q-10 -96 14 -86" stroke="#fff" stroke-width="6" fill="none" opacity=".5" stroke-linecap="round"/>
    <g id="${id}-crack"><path d="M10 -100 L0 -76 L14 -66 L-4 -40" stroke="#222" stroke-width="3" fill="none"/></g>
  </g>`;
}


// Swap on-screen English labels for another language's, shrinking text that would overflow its box.
function applyDict(map) {
  document.querySelectorAll('#svg text').forEach((el) => {
    const key = el.textContent.trim();
    const tr = map[key];
    if (!tr) return;
    const fs = parseFloat(el.getAttribute('font-size'));
    const w0 = el.getComputedTextLength();
    el.textContent = tr;
    el.removeAttribute('letter-spacing'); // wide tracking breaks up joined scripts
    const w1 = el.getComputedTextLength();
    if (fs && w1 > w0 * 1.1) el.setAttribute('font-size', (fs * (w0 * 1.1) / w1).toFixed(1));
  });
}
