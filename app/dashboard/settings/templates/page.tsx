import { redirect } from "next/navigation";

/** The old "Templates" tab is now part of Document settings. */
export default function LegacyTemplatesPage() {
  redirect("/dashboard/settings/documents");
}
