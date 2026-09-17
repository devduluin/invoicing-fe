import api from "./apiClient";
import {
  toListResult,
  type GetAllPayload,
  type ListResponse,
  type ListResult,
  type TableRow,
} from "@/app/types/apiResponses";

/** GET a list endpoint that returns the `{data, columns, attributes, meta}` envelope. */
export async function fetchList<T = TableRow>(
  path: string,
  params: GetAllPayload,
): Promise<ListResult<T>> {
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = value as string | number;
  }
  if (!query.page) query.page = 1;
  if (!query.limit) query.limit = 20;

  const { data } = await api.get<ListResponse<T>>(path, { params: query });
  return toListResult(data);
}
