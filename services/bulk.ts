import api from "./apiClient";

export interface BulkResult {
  id: string;
  success: boolean;
  message?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type BulkKind = "confirm" | "draft" | "delete" | "activate" | "deactivate";

/**
 * One HTTP round trip for N records — POST /<resource>/bulk-<kind> — instead of N: the backend runs
 * the same guarded single-record action per id and reports each one's own result, so a record that
 * can't be changed never blocks the rest of the batch.
 */
export async function bulkAction(resource: string, kind: BulkKind, ids: string[]): Promise<BulkResult[]> {
  const { data } = await api.post<Envelope<BulkResult[]>>(`/${resource}/bulk-${kind}`, { ids });
  return data.data;
}
