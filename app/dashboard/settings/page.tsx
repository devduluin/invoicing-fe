import { redirect } from "next/navigation";

/** There is no Settings overview page — Settings always opens straight into a category, with the
 *  settings navigation already in place beside it. Company is the default. */
export default function SettingsIndexPage() {
  redirect("/dashboard/settings/company");
}
