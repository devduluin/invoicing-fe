import type { ReactNode } from "react";
import CompanyGate from "@/components/auth/CompanyGate";
import DashboardShell from "@/components/dashboard/shell/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // The gate sits OUTSIDE the shell: no sidebar, header or page mounts (or fetches) before a valid
  // active company exists.
  return (
    <CompanyGate>
      <DashboardShell>{children}</DashboardShell>
    </CompanyGate>
  );
}
