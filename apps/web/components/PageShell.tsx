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
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        user={auth.user}
        onMenuClick={() => setMenuOpen(true)}
        onLoginClick={auth.openLogin}
        onLogoutClick={auth.logout}
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="absolute top-4 left-4 z-20 max-h-[calc(100%-2rem)]">
          <Sidebar
            user={auth.user}
            onLoginClick={auth.openLogin}
            onLogoutClick={auth.logout}
          />
        </div>
        {children}
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            user={auth.user}
            variant="embedded"
            onLoginClick={() => {
              setMenuOpen(false);
              auth.openLogin();
            }}
            onLogoutClick={auth.logout}
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
