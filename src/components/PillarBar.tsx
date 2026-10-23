import { useEffect, useState } from 'react';

interface Props {
  ship: number;
  fix: number;
  unblock: number;
  max: number;
  size?: 'md' | 'sm';
}

/** Stacked Ship/Fix/Unblock bar scaled against the leader. Fills on mount and when values change. */
export function PillarBar({ ship, fix, unblock, max, size = 'md' }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const k = ready && max > 0 ? 1 / max : 0;
  const segments = [
    { key: 'ship', x: 0, w: ship * k },
    { key: 'fix', x: ship * k, w: fix * k },
    { key: 'unblock', x: (ship + fix) * k, w: unblock * k },
  ];
  return (
    <div className={`bar bar-${size}`} aria-hidden>
      {segments.map((s) => (
        <span
          key={s.key}
          className={`bar-seg bar-${s.key}`}
          style={{ transform: `translateX(${s.x * 100}%) scaleX(${s.w})` }}
        />
      ))}
    </div>
  );
}
