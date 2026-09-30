import { preloadRemoteSelectItem } from "@/hooks/useRemoteSelectOptions";
import { getMitra } from "@/services/mitraService";
import { getSalesperson } from "@/services/salespersonService";
import { preloadContactPersons } from "./ContactPersonSelect";

/**
 * For a form filled from another document (edit, duplicate, "create from"): before the document's
 * values are applied, load what its pickers will show — the partner, the partner's contacts, the
 * salesperson — so they appear filled in on the first render instead of flashing empty and filling
 * a moment later. Use as `getX(id).then(withDocumentRefs(companyId)).then((doc) => …)`, while the
 * form is still on its loading skeleton. Never fails: a picker that couldn't be preloaded simply
 * loads itself as before.
 */
export function withDocumentRefs(companyId: string | null | undefined) {
  return async <T extends { mitra_id?: string | null; salesperson_id?: string | null }>(doc: T): Promise<T> => {
    const mitraId = doc.mitra_id ?? "";
    await Promise.all([
      mitraId ? preloadRemoteSelectItem("mitra", companyId, mitraId, getMitra) : undefined,
      mitraId ? preloadContactPersons(mitraId) : undefined,
      doc.salesperson_id ? preloadRemoteSelectItem("salespersons", companyId, doc.salesperson_id, getSalesperson) : undefined,
    ]);
    return doc;
  };
}
