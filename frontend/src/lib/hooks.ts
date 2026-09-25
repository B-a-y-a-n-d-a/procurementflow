import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../api/client';
import { toast } from '../app/toast';

/** Load data once per dependency change; exposes reload() for after mutations. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await loaderRef.current();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e instanceof ApiRequestError ? e : new ApiRequestError({ status: 0, code: 'UNKNOWN', message: String(e) }));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

/**
 * Wrap a mutation: tracks loading, shows the server's business-rule message as a toast on failure,
 * and an optional success toast.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, successMessage?: string | ((r: R) => string)) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const run = useCallback(
    async (...args: A): Promise<R | null> => {
      setLoading(true);
      setError(null);
      try {
        const r = await fn(...args);
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(r) : successMessage);
        return r;
      } catch (e) {
        const err = e instanceof ApiRequestError ? e : new ApiRequestError({ status: 0, code: 'UNKNOWN', message: String(e) });
        setError(err);
        toast.error(err.message, err.code);
        return null;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  return { run, loading, error, clearError: () => setError(null) };
}
