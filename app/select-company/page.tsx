import type { Metadata } from "next";
import { Suspense } from "react";
import SelectCompanyClient from "@/components/auth/SelectCompanyClient";

export const metadata: Metadata = {
  title: "Select Company",
};

export default function SelectCompanyPage() {
  return (
    <Suspense fallback={null}>
      <SelectCompanyClient />
    </Suspense>
  );
}
