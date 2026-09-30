"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 md:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- see Header */}
            <img src="/logo.png" alt="" className="size-11 rounded-xl object-cover" />
            <p className="text-lg font-semibold leading-tight">Shatrunjay Hills</p>
          </div>
          <Card>
            <CardContent>
              <LoginForm onSuccess={() => router.replace("/")} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden flex-col items-center justify-center bg-sidebar p-12 md:flex md:w-1/2">
        <p className="max-w-md text-center text-xl font-medium text-foreground">
          Shatrunjay Hills Web GIS Dashboard
        </p>
      </div>
    </div>
  );
}
