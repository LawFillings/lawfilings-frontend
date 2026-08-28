import type { AppealGroup } from '../types';
import './AppealRouteSelector.css';

interface AppealRouteSelectorProps {
  group: AppealGroup;
  onSelect: (caseTypeId: string) => void;
}

export function AppealRouteSelector({ group, onSelect }: AppealRouteSelectorProps) {
  return (
    <div>
      <p className="route-question">{group.question}</p>
      <div className="route-options">
        {group.options.map((opt) => (
          <button className="route-card" key={opt.caseTypeId} onClick={() => onSelect(opt.caseTypeId)}>
            <span className="route-card-label">{opt.label}</span>
            {opt.helpText && <span className="route-card-help">{opt.helpText}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
