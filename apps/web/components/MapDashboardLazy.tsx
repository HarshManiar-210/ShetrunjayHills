"use client";

import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

// The whole shell reads localStorage-backed auth state (role-gated nav,
// avatar), which a server render can't know — ssr:false avoids a hydration
// mismatch on first paint instead of reconciling against a guessed state.
export const MapDashboardLazy = dynamic(
  () => import("@/components/MapDashboard").then((m) => m.MapDashboard),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);
