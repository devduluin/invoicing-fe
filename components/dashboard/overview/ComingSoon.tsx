"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { pageTitle } from "../shell/nav";

/** Rendered for every /dashboard/* route that isn't built yet. */
export default function ComingSoon() {
  const title = pageTitle(usePathname());

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-5 grid size-20 place-items-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm">
        <Wrench className="size-8" />
      </span>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This module is under development and coming soon.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Back to Overview
      </Link>
    </div>
  );
}
