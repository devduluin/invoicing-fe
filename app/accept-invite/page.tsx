import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptInviteFlow from "@/components/auth/AcceptInviteFlow";

export const metadata: Metadata = { title: "Accept Invitation" };

/** Landing page of the SSO invitation email (public: the visitor may have no account yet). */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteFlow />
    </Suspense>
  );
}
