"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printDashboardSheet, type ExportInput } from "@/lib/map-export";
import { cn } from "@/lib/utils";

/**
 * Exports the map, its legend and its statistics as a PDF, by way of the
 * browser's print dialog — where "Save as PDF" is the destination.
 *
 * The work is async — the class areas come from the statistics endpoint, the
 * font has to be loaded before anything is measured, and the sheet has to
 * decode before it can be printed — so the button carries its own pending and
 * failed states rather than firing and hoping.
 *
 * `input` is a thunk, not a value: it has to be read at the moment of the
 * click, because the map's pixels, its centre and its zoom are all whatever
 * they are right then. Passing a snapshot prop would export the view as it
 * was when the header last rendered.
 */
export function ExportButton({
  input,
  className,
}: {
  /** Null while the map is still mounting, which disables the button. */
  input: () => ExportInput | null;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function run() {
    const request = input();
    if (!request) return;
    setState("working");
    try {
      await printDashboardSheet(request);
      setState("idle");
    } catch (err) {
      // Most likely cause is a cross-origin tile tainting the WebGL canvas,
      // which throws on read. Nothing the user can act on, so it says what
      // happened and stays out of the way.
      console.error("dashboard export failed", err);
      setState("failed");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={state === "working"}
      onClick={run}
      aria-label={
        state === "failed"
          ? "Export failed — try again"
          : "Export the map, legend and statistics as a PDF"
      }
      title={state === "failed" ? "Export failed — try again" : "Export as PDF"}
      className={cn(
        "rounded-full border border-nav-line bg-nav-soft text-nav-accent shadow-e1 transition-[color,background-color,border-color,box-shadow] hover:border-nav-accent/50 hover:bg-nav-line/50 hover:text-foreground hover:ring-[3px] hover:ring-nav-accent/15 focus-visible:ring-[3px] focus-visible:ring-nav-accent/25",
        state === "failed" && "border-destructive/50 text-destructive",
        className,
      )}
    >
      {state === "working" ? (
        <Loader2 className="animate-spin" strokeWidth={2.25} />
      ) : (
        <Printer strokeWidth={2.25} />
      )}
    </Button>
  );
}
