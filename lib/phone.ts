/** Indonesian phone handling shared by the partner and contact person forms.
 *  Inputs show a fixed "+62" prefix, so the local part never starts with 0 / 62 / +62. */

/** trims a leading 0 / 62 / +62 so the +62 prefix isn't doubled */
export function localPhone(v: string): string {
  return v.replace(/^\+?62/, "").replace(/^0/, "");
}

/** what is stored: "62" + digits, or undefined when empty */
export function toStoredPhone(local: string): string | undefined {
  const digits = local.replace(/\D/g, "");
  return digits ? `62${digits}` : undefined;
}

/** what is shown: 62812… -> 0812… (the way people write it) */
export function displayPhone(stored?: string): string {
  if (!stored) return "";
  return stored.startsWith("62") ? `0${stored.slice(2)}` : stored;
}
