"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/store/useAuthStore";
import { resolveDocConfig, type DocConfigType, type ResolvedDocConfig, type StoredDocConfig } from "@/lib/documentConfig";
import { getDocumentConfig } from "@/services/documentConfigService";

// One fetch per (company, document type) for the whole session; settings invalidate it on save/reset.
const cache = new Map<string, Promise<StoredDocConfig>>();
const listeners = new Set<() => void>();

const keyOf = (companyId: string | null | undefined, type: DocConfigType) => `${companyId ?? ""}:${type}`;

/** Shared by useDocConfig and useNewDocumentDefaults so both hit the SAME in-flight/cached
 *  request for a given (company, type) instead of each firing their own GET — a create page
 *  renders both (the template preview via useDocConfig, the notes/terms/signature defaults via
 *  useNewDocumentDefaults) for the identical resource. */
function fetchDocConfig(companyId: string | null | undefined, type: DocConfigType): Promise<StoredDocConfig> {
  const k = keyOf(companyId, type);
  let p = cache.get(k);
  if (!p) {
    p = getDocumentConfig(type)
      .then((r) => r.config)
      .catch(() => {
        cache.delete(k);
        return {} as StoredDocConfig;
      });
    cache.set(k, p);
  }
  return p;
}

/** Drop cached configuration (after saving or resetting) and tell mounted documents to refetch. */
export function invalidateDocConfig(type?: DocConfigType) {
  for (const k of [...cache.keys()]) if (!type || k.endsWith(`:${type}`)) cache.delete(k);
  listeners.forEach((l) => l());
}

/**
 * The saved configuration of a document type for the ACTIVE company, resolved with defaults.
 * `ready` is false until the first response; callers should not paint labels before then (a preview
 * would flash the default wording). `enabled: false` skips the request (the PDF page gets its
 * configuration injected, it never fetches).
 */
export function useDocConfig(type: DocConfigType, enabled = true): { config: ResolvedDocConfig; ready: boolean } {
  const companyId = useAuthStore((s) => s.activeCompanyId);
  const [stored, setStored] = useState<StoredDocConfig | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchDocConfig(companyId, type).then((c) => alive && setStored(c));
    return () => {
      alive = false;
    };
  }, [type, companyId, enabled, tick]);

  const config = useMemo(() => resolveDocConfig(type, stored), [type, stored]);
  return { config, ready: !enabled || stored !== null };
}

/**
 * New documents start from the document type's configured default notes, terms and signature.
 * Runs once on a NEW (not edited, not duplicated) document and only fills fields that are still
 * empty. Existing documents are never touched: they keep what was saved on them.
 */
export function useNewDocumentDefaults(type: DocConfigType, isEdit: boolean, apply: (cfg: ResolvedDocConfig) => void) {
  const companyId = useAuthStore((s) => s.activeCompanyId);
  useEffect(() => {
    if (isEdit || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("duplicate_from"))) return;
    let alive = true;
    fetchDocConfig(companyId, type).then((c) => alive && apply(resolveDocConfig(type, c)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isEdit, companyId]);
}
