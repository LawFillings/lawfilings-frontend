/**
 * The LawFilings trademark: a circular badge with an ornamental double-line frame, a scale of
 * justice (elongated hanging strings, not rigid rods) on the left half, and a stack of paper
 * sheets on the right half — with a soft gold halo glowing behind it. Fixed brand colours
 * (not the page's switchable accent theme — see settings.accentColour), since this is the
 * registered mark, not decor that should shift with a reader's colour preference.
 *
 * `halo` controls whether the glow renders — off for small inline uses (masthead-sized) where
 * a blurred glow would just look like noise, on for larger standalone placements.
 */
const NAVY = '#14273F';
const GOLD = '#D4AF37';
const GOLD_SOFT = '#E8CC6E';

interface Props {
  size?: number;
  halo?: boolean;
  /** Sets "LawFilings" in a straight horizontal line near the base — the full standalone mark.
   * Off for small inline uses (e.g. beside a separate wordmark in the masthead) where the text
   * would be illegible anyway. */
  wordmark?: boolean;
  className?: string;
}

export function BrandMark({ size = 40, halo = false, wordmark = false, className }: Props) {
  const gradientId = 'brand-mark-halo';
  // Every stroke is defined in the 240-unit viewBox, so it scales down with `size` — at masthead
  // size that leaves sub-pixel lines that all but disappear. Boost line weight for small renders
  // so the mark stays legible there; sizes above the reference get no boost, since those already
  // read fine at their own scale. Capped — the smallest features (the pan arcs' 7-unit radius,
  // the 4-unit-tall paper sheets) start blobbing into each other well before a boost large enough
  // to hit a full physical pixel at 30px would be reached.
  const strokeScale = Math.min(1.6, Math.max(1, 150 / size));
  // At masthead scale the mark sits directly on the navy masthead bar, right next to the badge's
  // own navy disc — plain gold reads flat against that much dark navy. Brighten to the lighter
  // gold for small renders so the linework actually separates from its background there; larger,
  // standalone placements (the watermark, a light card) already have enough contrast with GOLD.
  const strokeColor = size < 100 ? GOLD_SOFT : GOLD;
  // Text needs a bigger relative boost than plain strokes to stay readable at all — letterforms
  // have detail (counters, serifs) that vanishes well before a line of the same weight would.
  const textScale = Math.min(1.8, Math.max(1, 150 / size));
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="LawFilings"
    >
      {halo && (
        <defs>
          {/* Peaks well past the badge's own edge (r 94 of 140 = ~67%) rather than fading out
              right at it, so the visible ring reads as a filled glow, not a thin outline. */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.25" />
            <stop offset="65%" stopColor={GOLD} stopOpacity="0.6" />
            <stop offset="85%" stopColor={GOLD} stopOpacity="0.55" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {halo && <circle cx="120" cy="120" r="140" fill={`url(#${gradientId})`} />}

      {/* Badge disc + ornamental double-line frame */}
      <circle cx="120" cy="120" r="94" fill={NAVY} />
      <circle cx="120" cy="120" r="99" fill="none" stroke={strokeColor} strokeWidth={1.5 * strokeScale} />
      <circle cx="120" cy="120" r="90" fill="none" stroke={strokeColor} strokeWidth={1 * strokeScale} opacity="0.75" />

      {/* Scale of justice — left half. Strings (beam to pan) run 70→110, 40 long; the post runs
          70→125 (55 long, 15% past the strings) — the beam/pans stay put, only the base sits
          lower, so the post reads as distinctly longer than the strings without towering. */}
      <g stroke={strokeColor} strokeLinecap="round">
        <line x1="72" y1="125" x2="112" y2="125" strokeWidth={3 * strokeScale} />
        <line x1="92" y1="125" x2="92" y2="70" strokeWidth={3 * strokeScale} />
        <line x1="62" y1="70" x2="122" y2="70" strokeWidth={2 * strokeScale} />
        <line x1="62" y1="70" x2="55" y2="110" strokeWidth={1.8 * strokeScale} />
        <line x1="62" y1="70" x2="69" y2="110" strokeWidth={1.8 * strokeScale} />
        <line x1="122" y1="70" x2="115" y2="110" strokeWidth={1.8 * strokeScale} />
        <line x1="122" y1="70" x2="129" y2="110" strokeWidth={1.8 * strokeScale} />
      </g>
      <path d="M55 110 a7 7 0 0 0 14 0" fill="none" stroke={strokeColor} strokeWidth={2.2 * strokeScale} />
      <path d="M115 110 a7 7 0 0 0 14 0" fill="none" stroke={strokeColor} strokeWidth={2.2 * strokeScale} />
      <circle cx="92" cy="70" r={2.6 * strokeScale} fill={GOLD_SOFT} />

      {/* Paper stack — right half, golden sheets. Very thin, minute gaps, tucked close to the
          scale and lifted to rest on the same baseline (125) as the scale's base plate — each
          sheet tilted a little more than the one below it, so the whole stack leans right going
          from bottom to top rather than just the topmost sheet. */}
      <g>
        <rect x="135" y="121" width="50" height="4" rx="0.8" fill={GOLD_SOFT} stroke={strokeColor} strokeWidth={0.5 * strokeScale} />
        <rect x="135" y="116.5" width="50" height="4" rx="0.8" fill={GOLD_SOFT} stroke={strokeColor} strokeWidth={0.5 * strokeScale} transform="rotate(1.5 160 118.5)" />
        <rect x="135" y="112" width="50" height="4" rx="0.8" fill={GOLD_SOFT} stroke={strokeColor} strokeWidth={0.5 * strokeScale} transform="rotate(3 160 114)" />
        <rect x="135" y="107.5" width="50" height="4" rx="0.8" fill={GOLD_SOFT} stroke={strokeColor} strokeWidth={0.5 * strokeScale} transform="rotate(4.5 160 109.5)" />
        <rect x="135" y="103" width="50" height="4" rx="0.8" fill={GOLD_SOFT} stroke={strokeColor} strokeWidth={0.5 * strokeScale} transform="rotate(6 160 105)" />
        <rect
          x="135"
          y="98.5"
          width="50"
          height="4"
          rx="0.8"
          fill={GOLD_SOFT}
          stroke={strokeColor}
          strokeWidth={0.5 * strokeScale}
          transform="rotate(8 160 100.5)"
        />
      </g>

      {wordmark && (
        // textLength pins the rendered width regardless of fontSize, so boosting fontSize for
        // legibility at small sizes (below) can never push the text past the frame — at y=165
        // the chord is ~156 wide at the inner frame (r=90), so 140 leaves a safe margin.
        <text
          x="120"
          y="165"
          fill={GOLD_SOFT}
          fontSize={24 * textScale}
          fontFamily="var(--font-display), Georgia, serif"
          fontWeight="600"
          textAnchor="middle"
          textLength="140"
          lengthAdjust="spacingAndGlyphs"
        >
          LawFilings
        </text>
      )}
    </svg>
  );
}
