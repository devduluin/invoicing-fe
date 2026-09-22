import api from "./apiClient";
import { parseStoredConfig, type DocConfigType, type StoredDocConfig } from "@/lib/documentConfig";

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface Item {
  doc_type: DocConfigType;
  config: unknown;
  is_default: boolean;
  updated_at?: string;
}

export interface DocConfigRecord {
  docType: DocConfigType;
  config: StoredDocConfig;
  isDefault: boolean;
}

const toRecord = (i: Item): DocConfigRecord => ({ docType: i.doc_type, config: parseStoredConfig(i.config), isDefault: i.is_default });

export async function getDocumentConfig(type: DocConfigType): Promise<DocConfigRecord> {
  const { data } = await api.get<Envelope<Item>>(`/document-configurations/${type}`);
  return toRecord(data.data);
}

export async function saveDocumentConfig(type: DocConfigType, config: StoredDocConfig): Promise<DocConfigRecord> {
  const { data } = await api.put<Envelope<Item>>(`/document-configurations/${type}`, config);
  return toRecord(data.data);
}

export async function resetDocumentConfig(type: DocConfigType): Promise<void> {
  await api.delete(`/document-configurations/${type}`);
}
