import { fmt } from '../lib/format.ts';
import type { EngineerScore } from '../lib/score.ts';
import { PillarBar } from './PillarBar.tsx';

interface Props {
  engineers: EngineerScore[];
  max: number;
  onOpen: (login: string) => void;
}

export function RunnersUp({ engineers, max, onOpen }: Props) {
  if (!engineers.length) return null;
  return (
    <section className="panel" aria-labelledby="runners-title">
      <h2 id="runners-title" className="panel-title">
        Next five
      </h2>
      <ol className="runners" start={6}>
        {engineers.map((e, i) => (
          <li key={e.login} className="runner">
            <span className="runner-rank num">{i + 6}</span>
            <img className="avatar avatar-sm" src={e.avatar} alt="" width={20} height={20} loading="lazy" />
            <button type="button" className="runner-name" onClick={() => onOpen(e.login)}>
              {e.login}
            </button>
            <PillarBar ship={e.ship} fix={e.fix} unblock={e.unblock} max={max} size="sm" />
            <span className="runner-total num">{fmt(e.total)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
