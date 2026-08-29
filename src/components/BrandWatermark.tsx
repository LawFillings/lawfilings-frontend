import { BrandMark } from './BrandMark';
import './BrandWatermark.css';

/**
 * A single, page-independent instance mounted once in App.tsx — fixed to the viewport so it
 * shows through wherever a page's own content doesn't paint an opaque background over it,
 * the same way a letterhead watermark sits behind a printed page's text.
 */
export function BrandWatermark() {
  return (
    <div className="brand-watermark" aria-hidden="true">
      <BrandMark size={520} halo wordmark className="brand-watermark-mark" />
    </div>
  );
}
