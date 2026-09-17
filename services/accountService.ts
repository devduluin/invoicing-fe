import api from "./apiClient";
import { fetchList } from "./masterList";
import type { GetAllPayload, ListResult, TableRow } from "@/app/types/apiResponses";

export type AccountGroup = "asset" | "liability" | "equity" | "income" | "expense";

export interface Account {
  id: string;
  company_id: string;
  parent_id?: string;
  code: string;
  name: string;
  group: AccountGroup;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountInput {
  code: string;
  name: string;
  group: AccountGroup;
  parent_id?: string | null;
  is_active?: boolean;
}

/** Update payload — system accounts only accept `name` / `is_active` / `parent_id`. */
export interface AccountUpdateInput {
  code?: string;
  name?: string;
  group?: AccountGroup;
  parent_id?: string | null;
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Paginated COA list for the MasterTable. */
export function listAccounts(params: GetAllPayload): Promise<ListResult<TableRow>> {
  return fetchList("/accounts", params);
}

/** The whole chart (for parent / account pickers). */
export async function listAllAccounts(): Promise<Account[]> {
  const res = await fetchList<Account>("/accounts", { page: 1, limit: 500, sort: "code", order: "ASC" });
  return res.items;
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const { data } = await api.post<Envelope<Account>>("/accounts", input);
  return data.data;
}

export async function updateAccount(id: string, input: AccountUpdateInput): Promise<Account> {
  const { data } = await api.put<Envelope<Account>>(`/accounts/${encodeURIComponent(id)}`, input);
  return data.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/accounts/${encodeURIComponent(id)}`);
}

export const ACCOUNT_GROUP_LABEL: Record<AccountGroup, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};

export const ACCOUNT_GROUP_OPTIONS: { value: AccountGroup; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export interface AccountNode extends Account {
  children: AccountNode[];
  depth: number;
}

/** Build a parent→children tree, ordered by code, from a flat list. */
export function buildAccountTree(rows: Account[]): AccountNode[] {
  const byId = new Map<string, AccountNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [], depth: 0 });

  const roots: AccountNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: AccountNode[], depth: number) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    for (const n of nodes) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

/** Flatten a tree back to a render list (depth-first, keeps code order). */
export function flattenAccountTree(nodes: AccountNode[]): AccountNode[] {
  const out: AccountNode[] = [];
  const walk = (list: AccountNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
