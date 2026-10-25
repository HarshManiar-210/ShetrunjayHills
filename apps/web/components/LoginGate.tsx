import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/LoginForm";

/**
 * The full-screen "you must log in" view — shared by the standalone /login
 * route and MapDashboard's own gate (nothing on the site is reachable
 * without a session; see apps/api/cmd/api's RequireLogin group).
 */
export function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- see Header */}
          <img src="/logo.png" alt="" className="size-11 rounded-xl object-cover" />
          <p className="text-lg font-semibold leading-tight">Shatrunjay Hills</p>
        </div>
        <Card>
          <CardContent>
            <LoginForm onSuccess={onSuccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
