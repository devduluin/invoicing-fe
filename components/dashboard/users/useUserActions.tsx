"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { ConfirmDeleteModal } from "@/components/modal/ConfirmDeleteModal";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { removeMember, resendInvite, setMemberActive, type Member } from "@/services/memberService";

type Target = Pick<Member, "id" | "name" | "email">;

/** Deactivate / activate / resend / delete, with the confirmation modals. Shared by the list and the
 *  detail page so both behave identically. `onDone` refreshes whatever the caller shows. */
export function useUserActions(onDone: (kind: "delete" | "status" | "resend") => void): {
  toggleActive: (m: Target, activate: boolean) => void;
  resend: (m: Target) => Promise<void>;
  askDelete: (m: Target) => void;
  modals: ReactNode;
} {
  const tr = useTr();
  const [del, setDel] = useState<Target | null>(null);
  const [deact, setDeact] = useState<Target | null>(null);

  const doStatus = async (m: Target, activate: boolean) => {
    try {
      await setMemberActive(m.id, activate);
      toast.success(activate ? tr("Pengguna diaktifkan", "User activated") : tr("Pengguna dinonaktifkan", "User deactivated"));
      onDone("status");
    } catch (err) {
      toast.error(extractApiError(err, tr("Gagal mengubah status", "Could not change the status")));
    }
  };

  const modals = (
    <>
      <ConfirmDeleteModal
        open={!!del}
        title={tr("Hapus pengguna?", "Delete user?")}
        description={
          del
            ? tr(
                `${del.name || del.email} (${del.email}) akan dihapus dari perusahaan ini dan akses mereka langsung dicabut. Tindakan ini tidak dapat dibatalkan.`,
                `${del.name || del.email} (${del.email}) will be removed from this company and their access is revoked immediately. This can't be undone.`,
              )
            : undefined
        }
        confirmLabel={tr("Hapus pengguna", "Delete user")}
        onConfirm={async () => {
          if (!del) return;
          try {
            await removeMember(del.id);
            toast.success(tr("Pengguna dihapus", "User deleted"));
            setDel(null);
            onDone("delete");
          } catch (err) {
            toast.error(extractApiError(err, tr("Gagal menghapus pengguna", "Could not delete the user")));
            setDel(null);
          }
        }}
        onClose={() => setDel(null)}
      />
      <ConfirmDeleteModal
        open={!!deact}
        title={tr("Nonaktifkan pengguna?", "Deactivate user?")}
        description={
          deact
            ? tr(
                `${deact.name || deact.email} tidak akan bisa memakai akses perusahaan ini sampai diaktifkan kembali.`,
                `${deact.name || deact.email} won't be able to use this company's access until reactivated.`,
              )
            : undefined
        }
        confirmLabel={tr("Nonaktifkan", "Deactivate")}
        onConfirm={async () => {
          if (!deact) return;
          const t = deact;
          setDeact(null);
          await doStatus(t, false);
        }}
        onClose={() => setDeact(null)}
      />
    </>
  );

  return {
    toggleActive: (m, activate) => (activate ? void doStatus(m, true) : setDeact(m)),
    resend: async (m) => {
      try {
        await resendInvite(m.id);
        toast.success(tr("Undangan dikirim ulang", "Invitation resent"));
        onDone("resend");
      } catch (err) {
        toast.error(extractApiError(err, tr("Gagal mengirim ulang undangan", "Could not resend the invitation")));
      }
    },
    askDelete: setDel,
    modals,
  };
}
