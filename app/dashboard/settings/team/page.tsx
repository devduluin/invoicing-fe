"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Team management moved to Settings → Users & Access → Users; keep old links working. */
export default function TeamRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/settings/users");
  }, [router]);
  return null;
}
