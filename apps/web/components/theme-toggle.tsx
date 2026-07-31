"use client";

import { SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";

function toggleTheme() {
  const root = document.documentElement;
  const next = !root.classList.contains("dark");
  root.classList.toggle("dark", next);
  localStorage.setItem("theme", next ? "dark" : "light");
}

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <SunMoon strokeWidth={1.75} />
    </Button>
  );
}
