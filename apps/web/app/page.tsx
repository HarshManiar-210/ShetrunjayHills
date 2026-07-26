"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <p className="text-muted-foreground">Dashboard coming soon.</p>
    </div>
  );
}
