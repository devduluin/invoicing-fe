"use client";

import { Status } from "@/components/ui";
import { useTr } from "@/lib/useTr";
import type { MemberStatus } from "@/services/memberService";

/** Active / Pending / Inactive — always the shared StatusBadge vocabulary. */
export default function UserStatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  const tr = useTr();
  const label = status === "active" ? tr("Aktif", "Active") : status === "pending" ? tr("Menunggu", "Pending") : tr("Nonaktif", "Inactive");
  return <Status status={status} label={label} className={className} />;
}
