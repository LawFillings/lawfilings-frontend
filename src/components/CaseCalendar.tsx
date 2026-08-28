import { useMemo, useState } from 'react';
import type { CaseRecord } from '../lib/casesClient';
import { useLanguage } from '../lib/language';
import './CaseCalendar.css';

interface Props {
  cases: CaseRecord[];
  onSelectDate: (dateKey: string, casesOnDate: CaseRecord[]) => void;
}

/** Takes the date-ish string coming back from Postgres (either "YYYY-MM-DD" or a full ISO
 * timestamp) and returns just the "YYYY-MM-DD" portion, without going through a Date object —
 * parsing a bare date string as UTC and then reading local-timezone getters can shift the day
 * by one depending on the viewer's timezone, so this stays in string-land instead. */
function dateKeyOf(raw: string): string {
  return raw.slice(0, 10);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}


function localDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/**
 * Month-grid calendar marking the days that have at least one case's next hearing date.
 * Clicking a marked day reports which cases fall on it — used by MyCasesPage to scroll/highlight
 * the matching row(s) rather than navigating away.
 */
export function CaseCalendar({ cases, onSelectDate }: Props) {
  const { t } = useLanguage();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const casesByDate = useMemo(() => {
    const map = new Map<string, CaseRecord[]>();
    for (const c of cases) {
      if (!c.nextHearingDate) continue;
      const key = dateKeyOf(c.nextHearingDate);
      const existing = map.get(key);
      if (existing) existing.push(c);
      else map.set(key, [c]);
    }
    return map;
  }, [cases]);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const todayKey = localDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: { day: number | null; key: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: localDateKey(viewYear, viewMonth, day) });
  }

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="case-calendar">
      <div className="case-calendar-header">
        <button className="case-calendar-nav-btn" onClick={goPrevMonth} aria-label={t.myCases.calendarPrevMonth}>
          ‹
        </button>
        <p className="case-calendar-month">{monthLabel}</p>
        <button className="case-calendar-nav-btn" onClick={goNextMonth} aria-label={t.myCases.calendarNextMonth}>
          ›
        </button>
      </div>

      <div className="case-calendar-weekdays">
        {t.myCases.calendarWeekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="case-calendar-grid">
        {cells.map((cell, i) => {
          if (cell.day === null) return <span className="case-calendar-cell empty" key={`empty-${i}`} />;
          const matches = cell.key ? casesByDate.get(cell.key) : undefined;
          const isToday = cell.key === todayKey;
          if (!matches) {
            return (
              <span className={isToday ? 'case-calendar-cell today' : 'case-calendar-cell'} key={cell.key}>
                {cell.day}
              </span>
            );
          }
          return (
            <button
              className={isToday ? 'case-calendar-cell marked today' : 'case-calendar-cell marked'}
              key={cell.key}
              onClick={() => onSelectDate(cell.key!, matches)}
              title={matches.map((c) => c.title).join(', ')}
            >
              {cell.day}
              <span className="case-calendar-dot" />
            </button>
          );
        })}
      </div>

      {casesByDate.size === 0 && <p className="case-calendar-empty">{t.myCases.calendarNoUpcoming}</p>}
    </div>
  );
}
