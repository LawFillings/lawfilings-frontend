import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import './SearchableSelect.css';

export interface SearchableOption {
  key: string;
  label: string;
  meta?: string;
  tag?: ReactNode;
}

interface Props {
  label: string;
  placeholder: string;
  noMatches: string;
  options: SearchableOption[];
  onSelect: (key: string) => void;
  /** When the control picks a persistent value (e.g. a state), show it in the field while closed. */
  selectedKey?: string | null;
}

/** A type-to-filter dropdown: focus the field to see every option, type to narrow them, then pick
 *  with the mouse or Up/Down + Enter (Escape closes). The list opens inline (not floating) so the
 *  surrounding panel's clipping never cuts it off. */
export function SearchableSelect({ label, placeholder, noMatches, options, onSelect, selectedKey }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = selectedKey ? options.find((o) => o.key === selectedKey)?.label ?? '' : '';

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.meta ?? ''}`.toLowerCase().includes(q));
  }, [options, text]);

  const choose = (o: SearchableOption) => {
    setOpen(false);
    setText('');
    onSelect(o.key);
    // The option list's onMouseDown preventDefault()s to stop the input blurring awkwardly
    // mid-click, but that also leaves the field focused (and its focus ring showing) after a
    // choice is made — blur it explicitly so the field visibly settles once it's answered.
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault();
        choose(filtered[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="ss">
      <label className="ll-state-search-label" htmlFor={id}>
        {label}
      </label>
      <div className="ss-field">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          className="ss-input"
          placeholder={placeholder}
          value={text || (open ? '' : selectedLabel)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className="ss-toggle"
          aria-label={label}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
            (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus();
          }}
        >
          ▾
        </button>
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="ss-list">
          {filtered.length === 0 ? (
            <li className="ss-empty">{noMatches}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.key}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'ss-option active' : 'ss-option'}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="ss-option-title">
                  {o.label}
                  {o.tag}
                </span>
                {o.meta && <span className="ss-option-meta">{o.meta}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
