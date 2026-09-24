"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SelectOption } from "@/components/form/Select";

export interface RemotePage<T> {
  items: T[];
  hasNextPage: boolean;
}

export interface UseRemoteSelectOptionsArgs<T> {
  /** Cache namespace — one per resource, e.g. "mitra", "tax". */
  resource: string;
  /** Scopes the cache so switching the active company never shows another company's rows —
   *  every query key includes it, and it's part of the effect's own dependency list. */
  companyId: string | null | undefined;
  /** Extra filter params baked into the cache key (e.g. `{ type: "customer" }`). Stable primitives
   *  only — pass a plain object, it's re-serialized on every render but only its VALUE is used as
   *  a key, so a fresh object reference each render is fine. */
  dependency?: Record<string, string | undefined>;
  /** The field's current value — used to resolve a selected option that isn't loaded yet. */
  value: string;
  /** One page of remote results. Must itself apply company scoping/permission — this hook only
   *  orchestrates when/how often to call it. */
  fetchPage: (params: { page: number; search: string; pageSize: number }) => Promise<RemotePage<T>>;
  /** Fetch a single record by id, for when `value` isn't in any loaded page (edit mode opening on
   *  an old record, or a record from beyond the first page). Omit if the resource has none. */
  resolveById?: (id: string) => Promise<T | null>;
  toOption: (item: T) => SelectOption;
  pageSize?: number;
  searchDelay?: number;
}

interface CacheEntry<T> {
  pages: T[][];
  hasNextPage: boolean;
}

// Module-level: every mounted instance of the same (resource, company, dependency, search) shares
// one cache and one in-flight request, so two Partner dropdowns on the same page — or a page that
// remounts the field on re-render — never issue duplicate GETs for the same data.
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const resolveCache = new Map<string, Promise<unknown>>();

function depKey(dependency?: Record<string, string | undefined>): string {
  if (!dependency) return "";
  return Object.keys(dependency)
    .sort()
    .map((k) => `${k}=${dependency[k] ?? ""}`)
    .join("&");
}

/**
 * Backs a remote-data dropdown (Partner, Tax, Unit, …) with lazy fetch, infinite-scroll pagination,
 * debounced search, a shared cache, request de-duplication, stale-response guarding, and selected-
 * value resolution — the same behaviors as workin_dashboard_nextjs's DynamicSelect, adapted to
 * invoicing-fe's plain-axios + hooks architecture (no react-select, no separate cache store: one
 * module-level Map, matching the pattern hooks/useDocConfig.ts and hooks/useDownPaymentRef.ts
 * already use elsewhere in this codebase).
 *
 * Nothing is fetched until `open(true)` is called (the popover opening) — never on mount.
 */
export function useRemoteSelectOptions<T>({
  resource,
  companyId,
  dependency,
  value,
  fetchPage,
  resolveById,
  toOption,
  pageSize = 20,
  searchDelay = 400,
}: UseRemoteSelectOptionsArgs<T>) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tick, setTick] = useState(0); // bump to force a re-render after the module cache changes
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const openedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dKey = depKey(dependency);
  const queryKey = `${resource}::${companyId ?? ""}::${dKey}::${debouncedSearch}`;

  const getEntry = (): CacheEntry<T> => (cache.get(queryKey) as CacheEntry<T> | undefined) ?? { pages: [], hasNextPage: true };

  const load = (page: number) => {
    const reqKey = `${queryKey}::${page}`;
    if (inflight.has(reqKey)) return inflight.get(reqKey) as Promise<void>;
    const setBusy = page === 1 ? setLoading : setLoadingMore;
    setBusy(true);
    const p = fetchPage({ page, search: debouncedSearch, pageSize })
      .then((res) => {
        // A newer search may have started (and changed queryKey) while this was in flight — its
        // own reqKey guard already prevents a duplicate, but this result now belongs to a stale
        // key and must never be written into the CURRENT one.
        if (`${queryKey}::${page}` !== reqKey) return;
        const prev = getEntry();
        const pages = page === 1 ? [res.items] : [...prev.pages, res.items];
        cache.set(queryKey, { pages, hasNextPage: res.hasNextPage });
        setTick((t) => t + 1);
      })
      .catch(() => {
        // Leave the cache as-is (don't poison it with an empty page) so a retry (re-open, scroll
        // again) can succeed later.
      })
      .finally(() => {
        inflight.delete(reqKey);
        setBusy(false);
      });
    inflight.set(reqKey, p);
    return p;
  };

  // Debounce search input → resets pagination to page 1 for the NEW query bucket (the old search's
  // bucket is simply a different cache key — never mutated, never appended to).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), searchDelay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Re-fetch page 1 when the query key changes WHILE already open (a debounced search landing, or
  // the active company/dependency changing under an open dropdown) and nothing is cached for it
  // yet. The initial open is handled by onOpenChange below, not this effect — mounting must never
  // fetch on its own.
  useEffect(() => {
    if (!openedRef.current) return;
    if (cache.get(queryKey)) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const entry = getEntry();
  const items = useMemo(() => entry.pages.flat(), [entry]);
  const options = useMemo(() => items.map(toOption), [items, toOption]);

  // Selected-value resolution: if `value` isn't in any loaded page, fetch it by id — never page
  // through the whole list looking for it.
  const [resolved, setResolved] = useState<T | null>(null);
  useEffect(() => {
    setResolved(null);
    if (!value || !resolveById) return;
    if (items.some((it) => toOption(it).value === value)) return;
    const rKey = `${resource}::${companyId ?? ""}::${value}`;
    let p = resolveCache.get(rKey) as Promise<T | null> | undefined;
    if (!p) {
      p = resolveById(value).catch(() => null);
      resolveCache.set(rKey, p);
    }
    let alive = true;
    p.then((r) => alive && setResolved(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resource, companyId, items]);

  const resolvedOption = resolved ? toOption(resolved) : undefined;
  const finalOptions = useMemo(() => {
    if (!resolvedOption) return options;
    if (options.some((o) => o.value === resolvedOption.value)) return options;
    return [resolvedOption, ...options];
  }, [options, resolvedOption]);

  // The full record behind the current value — from a loaded page if it's there, otherwise the
  // one-off id resolve above. For callers that need more than {value,label} (e.g. a partner's
  // address/phone for a document preview), not just the SelectOption shown in the dropdown.
  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find((it) => toOption(it).value === value) ?? resolved;
  }, [items, toOption, value, resolved]);

  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) openedRef.current = true;
    if (isOpen && cache.get(queryKey) === undefined) load(1);
  };

  const onEndReached = () => {
    if (loading || loadingMore) return;
    if (!getEntry().hasNextPage) return;
    load(getEntry().pages.length + 1);
  };

  return {
    options: finalOptions,
    selectedItem,
    search,
    setSearch,
    loading,
    loadingMore,
    onOpenChange,
    onEndReached,
    hasNextPage: getEntry().hasNextPage,
  };
}

/** Drop every cached page for a resource (e.g. after creating a new partner inline, so the next
 *  open re-fetches and shows it) — mirrors invalidateDocConfig's shape in hooks/useDocConfig.ts. */
export function invalidateRemoteSelectOptions(resource: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(`${resource}::`)) cache.delete(k);
}

export type { SelectOption };
