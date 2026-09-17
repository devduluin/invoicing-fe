import type { Metadata } from "next";
import OverviewContent from "@/components/dashboard/overview/OverviewContent";

export const metadata: Metadata = { title: "Ringkasan" };

export default function DashboardPage() {
  return <OverviewContent />;
}
