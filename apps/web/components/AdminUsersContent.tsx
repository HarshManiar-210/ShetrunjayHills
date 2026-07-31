"use client";

import { ShieldAlert, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuthState } from "@/hooks/use-auth-state";

export function AdminUsersContent() {
  const { user } = useAuthState();

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl p-6">
        {user?.role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" strokeWidth={1.75} />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Role, layer, and permission management is coming soon — this
              screen will consume the admin write API once it ships.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-destructive" strokeWidth={1.75} />
                Access restricted
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The Users screen is only available to the admin role.
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
