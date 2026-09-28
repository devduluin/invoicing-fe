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

/**
 * One HTTP round trip for N documents, instead of N — the backend calls the exact same guarded
 * delete once per id and reports each one's own result, so a row that can't be deleted (still
 * referenced elsewhere) never blocks the rest of the batch.
 */
export async function bulkDelete(resource: string, ids: string[]): Promise<BulkResult[]> {
  const { data } = await api.post<Envelope<BulkResult[]>>(`/${resource}/bulk-delete`, { ids });
  return data.data;
}
