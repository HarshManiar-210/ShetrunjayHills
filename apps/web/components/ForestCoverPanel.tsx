"use client";

import { useState } from "react";
import { Satellite, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FOREST_COVER_YEARS,
  FOREST_COVER_SOURCES,
  getZoneStats,
  getGridStats,
  type ForestCoverYear,
  type ForestCoverSource,
} from "@/lib/forest-cover-mock";

type StatsView = "zone" | "grid";

export function ForestCoverPanel({
  year,
  onYearChange,
  source,
  onSourceChange,
  layerOn,
  onLayerOnChange,
  className,
}: {
  year: ForestCoverYear | null;
  onYearChange: (year: ForestCoverYear) => void;
  source: ForestCoverSource | null;
  onSourceChange: (source: ForestCoverSource) => void;
  layerOn: boolean;
  onLayerOnChange: (on: boolean) => void;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [statsView, setStatsView] = useState<StatsView>("zone");
  const stats = year ? (statsView === "zone" ? getZoneStats(year) : getGridStats(year)) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Satellite className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Forest Cover
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand forest cover panel" : "Collapse forest cover panel"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown className={cn("transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>

      {!collapsed && (
        <CardContent className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Year</span>
            <Select
              value={year ? String(year) : undefined}
              onValueChange={(v) => {
                onYearChange(Number(v) as ForestCoverYear);
                onLayerOnChange(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a year" />
              </SelectTrigger>
              <SelectContent>
                {FOREST_COVER_YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Satellite / Drone Source
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FOREST_COVER_SOURCES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={source === s ? "default" : "outline"}
                  onClick={() => onSourceChange(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 text-sm">
            <span className={cn(!year && "text-muted-foreground")}>Satellite/Drone Layer</span>
            <Switch
              size="sm"
              checked={layerOn}
              disabled={!year}
              onCheckedChange={onLayerOnChange}
              aria-label="Toggle satellite/drone layer"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Statistics{year ? ` — ${year}` : ""}
              </span>
              <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setStatsView("zone")}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                    statsView === "zone" ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                >
                  Zone
                </button>
                <button
                  type="button"
                  onClick={() => setStatsView("grid")}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                    statsView === "grid" ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                >
                  Grid
                </button>
              </div>
            </div>
            {stats ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="px-2 py-1 text-left font-medium">
                        {statsView === "zone" ? "Zone" : "Grid"}
                      </th>
                      <th className="px-2 py-1 text-right font-medium">Area (ha)</th>
                      <th className="px-2 py-1 text-right font-medium">Cover %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((row) => (
                      <tr key={row.zone} className="border-t border-border">
                        <td className="px-2 py-1">{row.zone}</td>
                        <td className="px-2 py-1 text-right font-mono">{row.areaHa}</td>
                        <td className="px-2 py-1 text-right font-mono">
                          {row.coverPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a year to see {statsView}-wise statistics.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/70 italic">
              Placeholder statistics — pending real per-year survey data.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
