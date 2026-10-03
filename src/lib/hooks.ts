"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Paginated } from "./api";

type Query = Record<string, string | number | boolean | null | undefined>;

type FetchState<T> = { data: T | null; error: string | null; key: string | null };

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Could not reach the server.");

/** GET `path` (with `query`) and refetch whenever either changes or
 *  reload() is called. `loading` is derived: true until the response for
 *  the current request key has arrived, so stale data stays visible
 *  (dimmed by callers) while a new page/filter loads. */
function useFetch<T>(path: string | null, query?: Query) {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, key: null });
  const [nonce, setNonce] = useState(0);
  const queryKey = JSON.stringify(query ?? {});
  const key = path ? `${path}|${queryKey}|${nonce}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api
      .get<T>(path, JSON.parse(queryKey))
      .then((data) => !cancelled && setState({ data, error: null, key }))
      .catch((e) => !cancelled && setState((s) => ({ data: s.data, error: errorMessage(e), key })));
    return () => {
      cancelled = true;
    };
  }, [path, queryKey, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (updater: T | null | ((prev: T | null) => T | null)) =>
      setState((s) => ({
        ...s,
        data: typeof updater === "function" ? (updater as (prev: T | null) => T | null)(s.data) : updater,
      })),
    [],
  );

  return {
    data: state.data,
    loading: key !== null && state.key !== key,
    error: state.key === key ? state.error : null,
    reload,
    setData,
  };
}

/** Fetch a paginated admin list and refetch whenever the query changes. */
export function useList<T>(path: string, query: Query) {
  return useFetch<Paginated<T>>(path, query);
}

/** Fetch a single resource (or any GET endpoint). */
export function useResource<T>(path: string | null) {
  return useFetch<T>(path);
}

/** Load every row of a small list (categories, collections) for dropdowns. */
export function useOptions<T>(path: string) {
  const [options, setOptions] = useState<T[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get<T[] | Paginated<T>>(path, { page_size: "all" })
      .then((res) => !cancelled && setOptions(Array.isArray(res) ? res : res.results))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [path]);
  return options;
}
