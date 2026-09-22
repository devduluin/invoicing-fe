"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { inviteMultiCompany } from "@/services/memberService";
import UserForm, { type UserFormValues } from "./UserForm";

export const USERS_PATH = "/dashboard/users";
/** Where "Back"/"Cancel"/a finished invite return to. There is no standalone list page at
 *  USERS_PATH anymore (Settings → Users & Access → Users is now the only user list) — USERS_PATH
 *  itself stays as the base for the add/detail/edit sub-routes, which are unchanged. */
export const USERS_LIST_PATH = "/dashboard/settings/users";

export default function InviteUserClient() {
  const tr = useTr();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (v: UserFormValues) => {
    setBusy(true);
    setError(undefined);
    try {
      await inviteMultiCompany({
        email: v.email,
        name: v.name,
        phone: v.phone,
        is_active: v.active,
        send_email: v.sendEmail,
        memberships: v.memberships,
      });
      toast.success(tr("Undangan berhasil dibuat", "Invitation created"));
      router.push(USERS_LIST_PATH);
    } catch (err) {
      // The form keeps everything the user typed; only the message changes.
      setError(extractApiError(err, tr("Gagal mengirim undangan. Coba lagi.", "Could not send the invitation. Please try again.")));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserPlus}
        title={tr("Undang Pengguna", "Invite User")}
        description={tr("Beri akses workspace dengan mengundang anggota baru.", "Grant workspace access by inviting new members.")}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(USERS_LIST_PATH)} disabled={busy}>
              {tr("Kembali", "Back")}
            </Button>
            <Button type="submit" form="user-form" variant="primary" loading={busy} disabled={!ready} leftIcon={<Send className="size-4" />} className="hidden lg:inline-flex">
              {tr("Kirim undangan", "Send Invitation")}
            </Button>
          </>
        }
      />
      <UserForm mode="invite" busy={busy} submitError={error} onSubmit={submit} onCancel={() => router.push(USERS_LIST_PATH)} onReadyChange={setReady} />
    </div>
  );
}
