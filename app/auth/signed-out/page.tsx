import type { Metadata } from "next";
import SignedOutClient from "@/components/auth/SignedOutClient";

export const metadata: Metadata = { title: "Signed Out" };

export default function SignedOutPage() {
  return <SignedOutClient />;
}
