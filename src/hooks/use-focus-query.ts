import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Runs a repository query when the screen mounts and again every time it
 * regains focus — so coming back from the add-expense modal shows the new row
 * without any store, subscription or cache-invalidation logic.
 *
 * SQLite reads on a personal-sized database are sub-millisecond, so re-querying
 * on focus is cheaper in every sense than keeping a second copy of the data in
 * memory and remembering to update it.
 *
 * `query` must be wrapped in `useCallback` by the caller, or it will refetch on
 * every render.
 */
export function useFocusQuery<T>(query: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  const run = useCallback(() => {
    let cancelled = false;

    query()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Returned to useFocusEffect: ignore an in-flight result if the screen
    // loses focus before the query lands.
    return () => {
      cancelled = true;
    };
  }, [query]);

  useFocusEffect(run);

  return { data, loading, refresh: run };
}
