import { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
  errors?: string[];
  error_code?: string;
}

/** Pull a user-safe message out of an invoice-service error response. */
export function extractApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
    if (body?.errors?.length) return body.errors[0];
  }
  return fallback;
}

export function apiErrorCode(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as ApiErrorBody | undefined)?.error_code;
  }
  return undefined;
}
