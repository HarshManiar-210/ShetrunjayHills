"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon } from "lucide-react";
import { clearToken, getToken, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Home() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-end gap-1 border-b p-3">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <UserIcon />
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Dashboard coming soon.</p>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>
              {user
                ? `Logged in as ${user.username} (${user.role})`
                : "Not logged in"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
