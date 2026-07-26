"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setHasToken(token !== null);
  }, [router]);

  if (!hasToken) return null;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <p className="text-muted-foreground">Dashboard coming soon.</p>
    </div>
  );
}
