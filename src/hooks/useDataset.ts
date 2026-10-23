import { useEffect, useState } from 'react';
import type { Dataset } from '../lib/types.ts';

/** Loads the static snapshot once. The page never calls GitHub. */
export function useDataset(): { data: Dataset | null; error: string | null } {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/data.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Dataset) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  return { data, error };
}
