import { MITRA_TYPE_LABEL, type MitraType } from "@/services/mitraService";

const TONE: Record<MitraType, { bg: string; text: string; dot: string }> = {
  customer: { bg: "#eef1ff", text: "#3b57d4", dot: "#6b8fff" },
  supplier: { bg: "#fffbeb", text: "#92400e", dot: "#f59e0b" },
  both: { bg: "#ecfdf5", text: "#065f46", dot: "#34d399" },
};

export default function MitraTypeBadge({ type }: { type: MitraType }) {
  const t = TONE[type] ?? TONE.customer;
  return (
    <span className="badge" style={{ background: t.bg, color: t.text }}>
      <span className="size-1.5 rounded-full" style={{ background: t.dot }} />
      {MITRA_TYPE_LABEL[type]}
    </span>
  );
}
