"use client";

import { useRouter } from "next/navigation";
import { LoginGate } from "@/components/LoginGate";

export default function LoginPage() {
  const router = useRouter();
  return <LoginGate onSuccess={() => router.replace("/")} />;
}
