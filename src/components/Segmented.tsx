import { useRef, type KeyboardEvent } from 'react';

interface Props<T extends string | number> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Segmented control with one sliding indicator; arrow keys move the selection. */
export function Segmented<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={onKey} style={{ ['--count' as string]: options.length }}>
      <span className="segmented-indicator" aria-hidden style={{ transform: `translateX(${index * 100}%)` }} />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="segmented-option"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
