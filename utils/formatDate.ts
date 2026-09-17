const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parse(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "09 Sep 2026" */
export function formatDateStyle(value: unknown): string {
  const d = parse(value);
  return d ? dateFmt.format(d) : "—";
}

/** "09 Sep 2026, 14.30" */
export function formatDateTimeStyle(value: unknown): string {
  const d = parse(value);
  return d ? dateTimeFmt.format(d) : "—";
}
