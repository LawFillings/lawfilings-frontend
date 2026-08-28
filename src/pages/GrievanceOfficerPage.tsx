import { useLanguage } from '../lib/language';
import { LegalDocPage } from './LegalDocPage';

interface Props {
  onBack: () => void;
}

export function GrievanceOfficerPage({ onBack }: Props) {
  const { t } = useLanguage();
  const c = t.grievanceOfficer;
  const card = c.officerCard;

  return (
    <LegalDocPage
      onBack={onBack}
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      highlightCard={{
        heading: card.heading,
        rows: [
          { label: card.nameLabel, value: card.name },
          { label: card.designationLabel, value: card.designation },
          { label: card.emailLabel, value: card.email },
          { label: card.phoneLabel, value: card.phone },
          { label: card.addressLabel, value: card.address },
        ],
      }}
      sections={c.sections}
    />
  );
}
