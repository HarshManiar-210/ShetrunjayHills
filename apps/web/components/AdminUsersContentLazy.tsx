"use client";

import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

export const AdminUsersContentLazy = dynamic(
  () => import("@/components/AdminUsersContent").then((m) => m.AdminUsersContent),
  { ssr: false, loading: () => <DashboardSkeleton /> },
);
