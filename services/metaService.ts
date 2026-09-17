import api from "./apiClient";

export interface Bank {
  name: string;
  code: string;
  swift_code?: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

let cache: Bank[] | null = null;
let inflight: Promise<Bank[]> | null = null;

/** The Indonesian bank directory (proxied + cached by invoice-service).
 *  Cached in-module for the tab session. */
export async function listBanks(): Promise<Bank[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = api
    .get<Envelope<Bank[]>>("/meta/banks")
    .then((res) => {
      cache = res.data.data ?? [];
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
