import type { Metadata } from "next";
import AcceptInviteClient from "@/components/auth/AcceptInviteClient";

export const metadata: Metadata = {
  title: "Accept Invitation",
};

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInviteClient token={token} />;
}
