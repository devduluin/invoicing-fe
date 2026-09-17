"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EMPTY_META,
  type GetAllPayload,
  type ListResult,
  type TableMeta,
  type TableRow,
} from "@/app/types/apiResponses";

type Fetcher<T extends TableRow> = (params: GetAllPayload) => Promise<ListResult<T>>;

export interface UseMasterListResult<T extends TableRow> {
  data: T[];
  columns: string[];
  attributes: string[];
  meta: TableMeta;
  loading: boolean;
  error: string | null;
  params: GetAllPayload;
  updateParams: (patch: Partial<GetAllPayload>, replace?: boolean) => void;
  refresh: () => void;
}

/**
 * Generic list state for a MasterTable page: holds the query params, calls
 * `fetcher(params)`, and re-fetches whenever params or `refreshKey` change.
 */
export function useMasterList<T extends TableRow>(
  fetcher: Fetcher<T>,
  initialParams: GetAllPayload,
): UseMasterListResult<T> {
  const [params, setParams] = useState<GetAllPayload>(() => ({
    page: 1,
    limit: 20,
    ...initialParams,
  }));
  const [data, setData] = useState<T[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [meta, setMeta] = useState<TableMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef
      .current(params)
      .then((res) => {
        if (!alive) return;
        setData(res.items);
        setColumns(res.columns);
        setAttributes(res.attributes);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setData([]);
        setMeta(EMPTY_META);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, refreshKey]);

  const updateParams = useCallback((patch: Partial<GetAllPayload>, replace = false) => {
    setParams((prev) => (replace ? { ...patch } : { ...prev, ...patch }));
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, columns, attributes, meta, loading, error, params, updateParams, refresh };
}
