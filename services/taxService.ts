import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type TaxKind = "ppn" | "pph" | "other";
export type TaxCalcMethod = "exclusive" | "inclusive";

export interface Tax {
  id: string;
  company_id: string;
  name: string;
  kind: TaxKind;
  rate: number;
  is_system: boolean;
  is_active: boolean;
  calc_method: TaxCalcMethod;
  sales_account_id?: string;
  purchase_account_id?: string;
  is_compound: boolean;
  component1_id?: string;
  component2_id?: string;
  created_at: string;
  updated_at: string;
}

/** Payload for a single (non-compound) tax. */
export interface SingleTaxInput {
  name: string;
  kind: TaxKind;
  calc_method: TaxCalcMethod;
  rate: number;
  sales_account_id: string;
  purchase_account_id: string;
  is_active?: boolean;
}

/** Payload for a compound tax — a named pair of two single taxes. */
export interface CompoundTaxInput {
  name: string;
  component1_id: string;
  component2_id: string;
  is_active?: boolean;
}

/** Update payload — system taxes only accept `rate` / `calc_method` /
 *  `sales_account_id` / `purchase_account_id` / `is_active`. */
export interface TaxUpdateInput {
  name?: string;
  kind?: TaxKind;
  calc_method?: TaxCalcMethod;
  rate?: number;
  sales_account_id?: string;
  purchase_account_id?: string;
  component1_id?: string;
  component2_id?: string;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function listTaxes(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/taxes", params);
}

/** Fetch every tax (for the compound-tax component pickers). */
export async function listAllTaxes(): Promise<Tax[]> {
  const res = await fetchList<Tax>("/taxes", { page: 1, limit: 200 });
  return res.items;
}

export async function createSingleTax(input: SingleTaxInput): Promise<Tax> {
  const { data } = await api.post<Envelope<Tax>>("/taxes", { ...input, is_compound: false });
  return data.data;
}

export async function createCompoundTax(input: CompoundTaxInput): Promise<Tax> {
  const { data } = await api.post<Envelope<Tax>>("/taxes", { ...input, is_compound: true });
  return data.data;
}

export async function updateTax(id: string, input: TaxUpdateInput): Promise<Tax> {
  const { data } = await api.put<Envelope<Tax>>(`/taxes/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteTax(id: string): Promise<void> {
  await api.delete(`/taxes/${encodeURIComponent(id)}`);
}

export const TAX_KIND_LABEL: Record<TaxKind, string> = {
  ppn: "VAT",
  pph: "Withholding Tax",
  other: "Other",
};

export const TAX_KIND_OPTIONS: { value: TaxKind; label: string }[] = [
  { value: "ppn", label: "VAT" },
  { value: "pph", label: "Withholding Tax" },
  { value: "other", label: "Other (local/regional taxes, etc.)" },
];

export const CALC_METHOD_LABEL: Record<TaxCalcMethod, string> = {
  exclusive: "Exclusive — tax added on top of price",
  inclusive: "Inclusive — tax already included in price",
};

export const CALC_METHOD_OPTIONS: { value: TaxCalcMethod; label: string }[] = [
  { value: "exclusive", label: CALC_METHOD_LABEL.exclusive },
  { value: "inclusive", label: CALC_METHOD_LABEL.inclusive },
];
