import { type CSSProperties, type ReactNode } from 'react';
import './IconGridSection.css';

export interface IconGridItem {
  icon: ReactNode;
  title: string;
  body: string;
  /** Optional small muted caption below the body — e.g. a verification date/source note that
   *  doesn't fit naturally into the body sentence itself. */
  meta?: string;
}

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  items: IconGridItem[];
  /** Desktop column count — the grid still collapses to 2 then 1 at the same breakpoints
   *  HowItWorks uses, so this only changes how wide the row is before that happens. */
  columns?: number;
  /** Overrides the section's default tinted-blue background (var(--accent-tint)) — e.g. a
   *  design-token color to alternate the band's tone against its neighbours. */
  background?: string;
}

/**
 * Full-bleed, centered icon-grid section — same visual pattern as HowItWorks (light tinted band,
 * centered eyebrow/title, circular navy icon badges) generalized so other sections can reuse it
 * without duplicating that CSS. HowItWorks itself is left as its own component/stylesheet rather
 * than migrated onto this, since it already works and isn't worth the regression risk.
 */
export function IconGridSection({ id, eyebrow, title, sub, items, columns = 3, background }: Props) {
  return (
    <section
      className="icon-grid-section"
      id={id}
      style={background ? ({ '--icon-grid-bg': background } as CSSProperties) : undefined}
    >
      <div className="icon-grid-section-inner">
        <p className="icon-grid-eyebrow">{eyebrow}</p>
        <h2 className="icon-grid-title">{title}</h2>
        {sub && <p className="icon-grid-sub">{sub}</p>}

        <div className="icon-grid-flow" style={{ '--icon-grid-columns': columns } as CSSProperties}>
          {items.map((item) => (
            <div className="icon-grid-item" key={item.title}>
              <span className="icon-grid-icon">{item.icon}</span>
              <p className="icon-grid-item-title">{item.title}</p>
              <p className="icon-grid-item-body">{item.body}</p>
              {item.meta && <p className="icon-grid-item-meta">{item.meta}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
