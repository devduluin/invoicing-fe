import { MITRA_TYPE_LABEL, type MitraType } from "@/services/mitraService";
import { StatusBadge } from "@/components/ui/StatusBadge";

/** Partner type is a category, not a status — it stays neutral (no colour per type). */
export default function MitraTypeBadge({ type }: { type: MitraType }) {
  return <StatusBadge label={MITRA_TYPE_LABEL[type] ?? type} tone="neutral" />;
}
