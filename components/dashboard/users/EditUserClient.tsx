"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserCog } from "lucide-react";
import toast from "react-hot-toast";

import { Button, ErrorState, Skeleton } from "@/components/ui";
import PageHeader from "@/components/layouts/page/PageHeader";
import { extractApiError } from "@/lib/apiError";
import { useTr } from "@/lib/useTr";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getMember,
  memberStatus,
  setMemberActive,
  updateMemberRole,
  updateMemberProfile,
  type MemberDetail,
} from "@/services/memberService";
import UserForm, { type UserFormValues } from "./UserForm";
import { USERS_PATH } from "./InviteUserClient";

export default function EditUserClient({ id }: { id: string }) {
  const tr = useTr();
  const router = useRouter();
  const myEmail = useAuthStore((s) => s.email);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    setLoadError(false);
    getMember(id)
      .then(setMember)
      .catch(() => setLoadError(true));
  }, [id]);
  useEffect(load, [load]);

  const back = `${USERS_PATH}/${id}`;

  const submit = async (v: UserFormValues) => {
    if (!member) return;
    setBusy(true);
    setError(undefined);
    try {
      const status = memberStatus(member);
      if (v.name !== (member.name ?? "") || v.phone !== (member.phone ?? "")) {
        await updateMemberProfile(id, v.name, v.phone);
      }
      const target = v.memberships[0];
      if (target && target.role_id !== (member.role_id ?? "")) await updateMemberRole(id, target.role_id);
      if (v.active !== (status !== "inactive")) await setMemberActive(id, v.active);
      toast.success(tr("Perubahan disimpan", "Changes saved"));
      router.push(back);
    } catch (err) {
      setError(extractApiError(err, tr("Gagal menyimpan perubahan.", "Could not save the changes.")));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserCog}
        title={tr("Ubah Pengguna", "Edit User")}
        description={tr("Perbarui data, akses perusahaan, dan status akun.", "Update details, company access and account status.")}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(back)} disabled={busy}>
              {tr("Batal", "Cancel")}
            </Button>
            <Button type="submit" form="user-form" variant="primary" loading={busy} disabled={!member} leftIcon={<Save className="size-4" />} className="hidden lg:inline-flex">
              {tr("Simpan perubahan", "Save changes")}
            </Button>
          </>
        }
      />
      {loadError ? (
        <ErrorState onRetry={load} />
      ) : !member ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <UserForm
          mode="edit"
          member={member}
          isSelf={!!myEmail && myEmail.toLowerCase() === member.email.toLowerCase()}
          busy={busy}
          submitError={error}
          onSubmit={submit}
          onCancel={() => router.push(back)}
        />
      )}
    </div>
  );
}
