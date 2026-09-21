"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
      variant="outline"
      disabled={state === "working"}
      onClick={run}
      aria-label={
        state === "failed"
          ? "Export failed — try again"
          : "Export the map, legend and statistics as a PDF"
      }
      title={state === "failed" ? "Export failed — try again" : "Export as PDF"}
      // Built like the layer picker across the bar: same height, same pill,
      // same inset shading, so the two named controls in the header match.
      className={cn(
        "h-10 shrink-0 gap-2 rounded-full border-nav-line bg-nav-soft px-3.5 text-sm font-medium",
        "shadow-[inset_0_1px_2px_oklch(0.30_0.01_96_/_0.07)]",
        "transition-[color,box-shadow,background-color,border-color]",
        "hover:border-nav-accent/45 hover:bg-nav-soft",
        "focus-visible:border-nav-accent/60 focus-visible:ring-[3px] focus-visible:ring-nav-accent/20",
        state === "failed" && "border-destructive/50 text-destructive",
        className,
      )}
    >
      {state === "working" ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-nav-accent" strokeWidth={2} />
      ) : (
        <Upload
          className={cn("size-4 shrink-0", state === "failed" ? "text-destructive" : "text-nav-accent")}
          strokeWidth={2}
        />
      )}
      {/* The label carries the meaning; on a phone the bar has no room for
          it and the icon stands alone, as the other controls do. */}
      <span className="hidden sm:inline">
        {state === "working" ? "Exporting…" : state === "failed" ? "Export failed" : "Export map"}
      </span>
    </Button>
  );
}
