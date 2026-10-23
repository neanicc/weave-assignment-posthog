import { useCallback, useEffect, useMemo, useState } from 'react';
import { EngineerCard } from './components/EngineerCard.tsx';
import { EngineerDrawer } from './components/EngineerDrawer.tsx';
import { Methodology } from './components/Methodology.tsx';
import { ReviewNetwork } from './components/ReviewNetwork.tsx';
import { RunnersUp } from './components/RunnersUp.tsx';
import { Segmented } from './components/Segmented.tsx';
import { useDataset } from './hooks/useDataset.ts';
import { scoreEngineers } from './lib/score.ts';

const WINDOWS = [
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 120, label: '120d' },
] as const;
const VIEWS = [
  { value: 'ranking', label: 'Ranking' },
  { value: 'network', label: 'Network' },
] as const;
type View = (typeof VIEWS)[number]['value'];
const SUN = (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
const MOON = (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
    <path
      d="M13.2 10.1A5.6 5.6 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);
const THEMES = [
  { value: 'light', label: 'Light theme', icon: SUN },
  { value: 'dark', label: 'Dark theme', icon: MOON },
] as const;
type Theme = (typeof THEMES)[number]['value'];

function initialTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  // Until the viewer picks a theme, follow the system setting live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = (ev: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('impact:theme');
      } catch {
        /* storage unavailable */
      }
      if (!saved) setThemeState(ev.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', follow);
    return () => mq.removeEventListener('change', follow);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.add('theming');
    root.dataset.theme = t;
    try {
      localStorage.setItem('impact:theme', t);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    setThemeState(t);
    window.setTimeout(() => root.classList.remove('theming'), 350);
  }, []);
  return [theme, setTheme];
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function App() {
  const { data, error } = useDataset();
  const [days, setDays] = useState<number>(90);
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<View>('ranking');
  const [theme, setTheme] = useTheme();

  const ranked = useMemo(() => (data ? scoreEngineers(data, days) : []), [data, days]);
  const prsInWindow = useMemo(() => {
    if (!data) return 0;
    const cutoff = Date.parse(data.windowEnd) - days * 86400e3;
    return data.prs.filter((p) => !p.bot && Date.parse(p.mergedAt) >= cutoff).length;
  }, [data, days]);
  useEffect(() => {
    if (open && !ranked.some((e) => e.login === open)) setOpen(null);
  }, [ranked, open]);

  const top = ranked.slice(0, 5);
  const max = top[0]?.total ?? 0;
  const selected = ranked.find((e) => e.login === open) ?? null;

  return (
    <div className="page">
      <header className="top">
        <div className="top-text">
          <h1 className="title">PostHog&rsquo;s most impactful engineers</h1>
          <p className="lede">
            Points for shipping, fixing and reviewing, from every merged PR in{' '}
            <a href="https://github.com/PostHog/posthog" target="_blank" rel="noreferrer">
              PostHog/posthog
            </a>
            . <strong className="lede-cta">Click anyone to see each PR behind their score.</strong>
          </p>
        </div>
      </header>

      <div className="toolbar">
        {data ? (
          <p className="toolbar-meta">
            <b>{view === 'ranking' ? 'Top 5' : 'Review network'}, last {days} days</b>
            <span className="muted">
              {' '}
              · {prsInWindow.toLocaleString()} PRs · {ranked.length} engineers active · data as of{' '}
              {dateFmt.format(new Date(data.generatedAt))}
            </span>
          </p>
        ) : (
          <span />
        )}
        <div className="top-controls">
          <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
          <Segmented label="Time window" options={WINDOWS} value={days} onChange={setDays} />
          <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
        </div>
      </div>

      {error && (
        <p className="state state-error" role="alert">
          Couldn&rsquo;t load the data snapshot ({error}). Reload to try again.
        </p>
      )}
      {!data && !error && (
        <div className="grid" aria-busy="true" aria-label="Loading">
          <div className="col-main">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        </div>
      )}

      {data && (
        <main className="grid">
          <section className="col-main" aria-label={view === 'ranking' ? `Top 5, last ${days} days` : 'Review network'}>
            {top.length === 0 && <p className="state">No human activity in this window.</p>}
            {view === 'ranking' ? (
              <div className="cards">
                {top.map((e, i) => (
                  <EngineerCard key={e.login} rank={i + 1} engineer={e} max={max} onOpen={setOpen} />
                ))}
              </div>
            ) : (
              <ReviewNetwork data={data} days={days} engineers={ranked.slice(0, 12)} onOpen={setOpen} />
            )}
          </section>
          <aside className="col-side">
            <Methodology data={data} />
            <RunnersUp engineers={ranked.slice(5, 10)} max={max} onOpen={setOpen} />
          </aside>
        </main>
      )}

      <EngineerDrawer engineer={selected} days={days} onClose={() => setOpen(null)} />
    </div>
  );
}
