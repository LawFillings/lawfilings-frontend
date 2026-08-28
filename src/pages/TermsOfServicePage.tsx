import { useLanguage } from '../lib/language';
import { LegalDocPage } from './LegalDocPage';

interface Props {
  onBack: () => void;
}

export function TermsOfServicePage({ onBack }: Props) {
  const { t } = useLanguage();
  const c = t.termsOfService;

  return (
    <LegalDocPage
      onBack={onBack}
      eyebrow={c.eyebrow}
      title={c.title}
      effectiveDate={c.effectiveDate}
      intro={c.intro}
      sections={c.sections}
    />
  );
}
