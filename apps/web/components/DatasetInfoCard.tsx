import { Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ROWS: Array<[string, string]> = [
  ["Dataset", "Shetrunjay Hills GIS Dataset"],
  ["Description", "Base layers and infrastructure for conservation planning."],
  ["Last Updated", "May 16, 2025"],
  ["Source", "MoEFCC, Bhuvan, GIDC"],
  ["CRS", "EPSG:4326"],
  ["Scale", "1:50,000"],
];

export function DatasetInfoCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Dataset Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {ROWS.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="max-w-[70ch]">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
