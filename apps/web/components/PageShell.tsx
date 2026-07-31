"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuthState } from "@/hooks/use-auth-state";

export function PageShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={auth.user}
        onLoginClick={auth.openLogin}
        onLogoutClick={auth.logout}
        className="hidden w-64 shrink-0 border-r border-sidebar-border xl:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={auth.user}
          map={null}
          onMenuClick={() => setMenuOpen(true)}
          onLoginClick={auth.openLogin}
          onLogoutClick={auth.logout}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            user={auth.user}
            onLoginClick={() => {
              setMenuOpen(false);
              auth.openLogin();
            }}
            onLogoutClick={auth.logout}
            className="flex"
          />
        </SheetContent>
      </Sheet>

      <LoginDialog
        open={auth.loginOpen}
        onOpenChange={auth.setLoginOpen}
        onSuccess={auth.onLoginSuccess}
      />
    </div>
  );
}
