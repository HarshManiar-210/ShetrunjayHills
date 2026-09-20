"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Bumped when the steps change enough that returning users should see it again. */
const SEEN_KEY = "shetrunjay.walkthrough.v2";

interface Step {
  /** Value of the data-tour attribute to spotlight. Omitted = centred card. */
  target?: string;
  title: string;
  body: string;
}

// Ordered the way a first-time visitor works through the dashboard: pick a
// theme, narrow it down, read it back off the map, then the tools around it.
const STEPS: Step[] = [
  {
    title: "Welcome to Shatrunjay Hills",
    body: "A quick tour of the GIS dashboard — where the layers live, how to read the map, and what the panels around it do. Two minutes, and you can leave at any point.",
  },
  {
    target: "sections",
    title: "Themes and layers",
    body: "Every layer lives in a section — Forest Cover, Watershed Analysis, Base Layers and so on. Switch on as many as you like: they all draw together, with vector layers always above raster imagery.",
  },
  {
    target: "section-theme",
    title: "Switch a section on",
    body: "The switch turns a section's layers on; clicking its name expands it, so you can reach a multi-year theme's Year dropdown or a group's individual layers without changing what is drawn. A layer marked “Pending” has no data delivered yet.",
  },
  {
    target: "search",
    title: "Find a layer fast",
    body: "Rather than scrolling the sections, type part of a layer's name here and pick it — the dashboard expands the right section and switches that layer on, leaving whatever else you have on alone.",
  },
  {
    target: "legend",
    title: "Legend and Statistics",
    body: "Legend shows what the colours on the map mean, with a gradient for any theme whose classes run low to high. Statistics sits below it as its own panel — class areas and shares, measured from the imagery itself — so you can read both at once.",
  },
  {
    target: "map-controls",
    title: "Map controls",
    body: "Zoom in and out, or reset the view back to the data's extent. Clicking any feature on the map opens its attribute popup.",
  },
  {
    title: "Sign in for more layers",
    body: "Some layers are restricted by role and simply aren't listed until you sign in. Sign in from the /login page; admins also get the user-management page from the sidebar.",
  },
];

const PADDING = 6;
const CARD_WIDTH = 320;
const CARD_HEIGHT_ESTIMATE = 200;
const GAP = 12;
const MARGIN = 12;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(target: string | undefined): Rect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // A display:none element (the sidebar below xl, say) still answers
  // querySelector but measures zero — treat that as "not on screen".
  if (rect.width === 0 || rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

// Below the target when there is room, otherwise above it; horizontally
// aligned to the target's left edge and then clamped into the viewport.
function cardPosition(rect: Rect | null): { top: number; left: number } | null {
  if (!rect) return null;

  const below = rect.top + rect.height + GAP;
  const fitsBelow = window.innerHeight - below > CARD_HEIGHT_ESTIMATE;
  const top = fitsBelow
    ? below
    : Math.max(MARGIN, rect.top - GAP - CARD_HEIGHT_ESTIMATE);
  const left = Math.min(
    Math.max(MARGIN, rect.left),
    Math.max(MARGIN, window.innerWidth - CARD_WIDTH - MARGIN),
  );
  return { top, left };
}

/**
 * Spotlight walkthrough of the dashboard. Mount it to run the tour and
 * unmount it to end one — it always starts at step 1, so the caller never has
 * to reset it. See shouldAutoRunWalkthrough() for the first-visit trigger.
 */
export function Walkthrough({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  // Measurement is kept with the step it belongs to, so a step change never
  // draws the spotlight at the previous step's position for a frame.
  const [measured, setMeasured] = useState<{ step: number; rect: Rect | null } | null>(null);

  const step = STEPS[index];

  // Measured in a rAF callback rather than in the effect body: the target may
  // still be animating in (the mobile sheet), and setting state synchronously
  // from an effect cascades a render.
  useEffect(() => {
    const target = STEPS[index]?.target;
    const remeasure = () => setMeasured({ step: index, rect: measure(target) });
    const frame = requestAnimationFrame(remeasure);
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [index]);

  // Steps whose target isn't on screen at this breakpoint are skipped rather
  // than shown pointing at nothing — keep walking in whichever direction the
  // user was already going.
  const advance = useCallback(
    (direction: 1 | -1) => {
      let next = index + direction;
      while (next > 0 && next < STEPS.length && measure(STEPS[next].target) === null) {
        next += direction;
      }
      if (next >= STEPS.length) onClose();
      else setIndex(Math.max(0, next));
    },
    [index, onClose],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") advance(1);
      else if (event.key === "ArrowLeft") advance(-1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [advance, onClose]);

  // Nothing to draw until this step has been measured — one frame, and it
  // avoids a centred card jumping to its spotlight position.
  if (!step || measured?.step !== index) return null;

  const rect = measured.rect;
  const position = cardPosition(rect);
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard walkthrough"
    >
      {rect ? (
        // The dimmed backdrop is this element's own outer shadow, which leaves
        // a genuine hole over the target — no SVG mask, and the highlighted
        // control stays fully visible underneath.
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <div
        className={cn(
          "absolute flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground shadow-lg ring-1 ring-foreground/10",
          !position && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={position ?? undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Step {index + 1} of {STEPS.length}
            </span>
            <p className="font-heading text-base leading-snug font-medium">{step.title}</p>
          </div>
          <Button variant="ghost" size="icon-xs" aria-label="Close walkthrough" onClick={onClose}>
            <X />
          </Button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= index ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Skip tour
          </Button>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => advance(-1)}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={() => (isLast ? onClose() : advance(1))}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True the first time this browser opens the dashboard — the tour auto-runs then. */
export function shouldAutoRunWalkthrough(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === null;
  } catch {
    // Private mode / storage blocked: don't nag on every load.
    return false;
  }
}

export function markWalkthroughSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do — the tour just runs again next time.
  }
}
