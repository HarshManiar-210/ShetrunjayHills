"use client";

import { useRouter } from "next/navigation";
import { Mountain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 md:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <Mountain className="size-6 text-primary" strokeWidth={1.75} />
            <div>
              <p className="text-base font-semibold leading-tight">
                Shetrunjay Hills
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                Web GIS Dashboard
              </p>
            </div>
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
          Shetrunjay Hills Web GIS Dashboard
        </p>
      </div>
    </div>
  );
}
