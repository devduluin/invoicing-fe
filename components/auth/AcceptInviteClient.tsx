"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailX } from "lucide-react";

import { Button } from "@/components/ui";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { acceptInvite } from "@/services/memberService";

type Phase = { name: "working" } | { name: "done" } | { name: "failed"; message: string };

/** Landing page of the invitation email. The middleware has already made sure the visitor is signed
 *  in (new people register through SSO first and are sent back here); this only redeems the token. */
export default function AcceptInviteClient({ token }: { token: string }) {
  const tr = useTr();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // the token is single-use; never redeem it twice
    started.current = true;
    acceptInvite(token)
      .then(() => {
        setPhase({ name: "done" });
        setTimeout(() => router.replace("/select-company"), 1200);
      })
      .catch((err) =>
        setPhase({
          name: "failed",
          message: extractApiError(err, tr("Undangan tidak valid atau sudah digunakan.", "This invitation is invalid or has already been used.")),
        }),
      );
  }, [token, router, tr]);

  return (
    <main className="grid min-h-svh place-items-center bg-[var(--surface-2)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        {phase.name === "working" && (
          <>
            <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800">{tr("Menerima undangan…", "Accepting your invitation…")}</p>
          </>
        )}
        {phase.name === "done" && (
          <>
            <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800">{tr("Undangan diterima", "Invitation accepted")}</p>
            <p className="mt-1 text-[13px] text-slate-500">{tr("Mengarahkan ke pilihan perusahaan…", "Taking you to your companies…")}</p>
          </>
        )}
        {phase.name === "failed" && (
          <>
            <MailX className="mx-auto size-8 text-slate-500" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-800">{tr("Undangan tidak dapat diterima", "Invitation could not be accepted")}</p>
            <p role="alert" className="mt-1 text-[13px] text-slate-500">{phase.message}</p>
            <Button className="mt-4" variant="primary" onClick={() => router.replace("/select-company")}>
              {tr("Lanjut", "Continue")}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
