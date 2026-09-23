"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox, sized to sit in a layer row beside its label.
 *
 * Supports the indeterminate state Radix calls `"indeterminate"`, which a
 * group uses when only some of its layers are ticked.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Not border-input: that token is oklch(0.332) in the dark theme, a
        // shade off the card it sits on, so an unticked box was invisible on
        // the floating panels. These are the only inputs on those surfaces,
        // so the contrast belongs here rather than in the token.
        "peer size-4 shrink-0 rounded-[4px] border border-foreground/60 shadow-e1 outline-none transition-[color,box-shadow]",
        "hover:border-foreground/80",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground",
        "data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand data-[state=indeterminate]:text-brand-foreground",
        "focus-visible:ring-[3px] focus-visible:ring-brand/30",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {props.checked === "indeterminate" ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : (
          <Check className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
