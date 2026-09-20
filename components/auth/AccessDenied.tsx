"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui";

/** Standard "you don't have permission" state — the default PermissionGate
 *  fallback, and reusable directly by any page that wants a fuller message
 *  than the default. Never a blank page. */
export default function AccessDenied({
  title = "Access denied",
  description = "You don't have permission to view this page. If you think this is a mistake, ask your company owner or admin to grant access.",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <ShieldAlert className="size-6" />
      </span>
      <div>
        <h2 className="font-display text-base font-bold text-slate-800">{title}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </Button>
    </div>
  );
}
