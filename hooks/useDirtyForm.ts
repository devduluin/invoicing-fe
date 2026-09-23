"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Generic "has anything actually changed" tracker for Create/Edit document forms. Captures a
 * JSON snapshot of `current` the first time it stops being the initial empty/loading shape (so
 * data arriving from the API is never mistaken for a user edit), then re-diffs on every render.
 * Call `markClean()` right after a successful save so Save disables again immediately.
 *
 * `current` should be one plain object holding everything the form can change — fields, line
 * items, discount, tax, notes, terms, attachment, signature, template, etc. — so there is exactly
 * one comparison per page, not one per field.
 */
export function useDirtyForm<T>(current: T, ready = true): { isDirty: boolean; markClean: () => void; reset: () => T | undefined } {
  const baseline = useRef<string | undefined>(undefined);
  const [, force] = useState(0);

  useEffect(() => {
    if (!ready || baseline.current !== undefined) return;
    baseline.current = JSON.stringify(current);
    force((n) => n + 1);
    // Only take the very first snapshot once the form is ready — never re-arm on later data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const snapshot = JSON.stringify(current);
  const isDirty = baseline.current !== undefined && baseline.current !== snapshot;

  const markClean = () => {
    baseline.current = snapshot;
    force((n) => n + 1);
  };

  /** Returns the last-saved snapshot (parsed) so a Reset action can restore it, or undefined
   *  before the baseline is captured. */
  const reset = (): T | undefined => (baseline.current === undefined ? undefined : (JSON.parse(baseline.current) as T));

  return { isDirty, markClean, reset };
}
