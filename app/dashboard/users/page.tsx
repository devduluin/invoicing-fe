"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The user list now lives at Settings → Users & Access → Users; keep old links working instead of
 *  falling through to the generic "coming soon" catch-all. Add/detail/edit stay at their own
 *  /dashboard/users/* routes, unchanged. */
export default function UsersListRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/settings/users");
  }, [router]);
  return null;
}
