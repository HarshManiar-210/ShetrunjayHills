"use client";

import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// Same ssr:false rationale as MapDashboardLazy — PageShell reads auth state
// too, so it can't be reconciled against a server-rendered guess.
export const PageShellLazy = dynamic(
  () => import("@/components/PageShell").then((m) => m.PageShell),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);
