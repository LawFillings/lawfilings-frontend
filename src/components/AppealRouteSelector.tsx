import type { AppealGroup } from '../types';
import { useLanguage } from '../lib/language';
import './AppealRouteSelector.css';

interface AppealRouteSelectorProps {
  group: AppealGroup;
  onSelect: (caseTypeId: string) => void;
}

export function AppealRouteSelector({ group, onSelect }: AppealRouteSelectorProps) {
  const { t } = useLanguage();
  const copy = t.appealRouteGroups[group.id];
  return (
    <div>
      <p className="route-question">{copy.question}</p>
      <div className="route-options">
        {group.options.map((opt) => (
          <button className="route-card" key={opt.caseTypeId} onClick={() => onSelect(opt.caseTypeId)}>
            <span className="route-card-label">{opt.label}</span>
            {opt.helpText && <span className="route-card-help">{copy.optionHelp[opt.caseTypeId]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
