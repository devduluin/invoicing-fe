/** The toast after an import: "3 partners created, 2 updated" (ID: "3 mitra dibuat, 2 diperbarui"). */
export function importResultText(
  tr: (id: string, en: string) => string,
  res: { created: number; updated?: number },
  noun: string,
): string {
  const created = res.created ?? 0;
  const updated = res.updated ?? 0;
  if (!updated) return tr(`${created} ${noun} dibuat`, `${created} ${noun} created`);
  if (!created) return tr(`${updated} ${noun} diperbarui`, `${updated} ${noun} updated`);
  return tr(`${created} ${noun} dibuat, ${updated} diperbarui`, `${created} ${noun} created, ${updated} updated`);
}
