import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageShellLazy } from "@/components/PageShellLazy";

export default function AboutPage() {
  return (
    <PageShellLazy>
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>About Shetrunjay Hills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p className="max-w-[70ch]">
              Shetrunjay Hills is a Web GIS dashboard for exploring base layers
              and infrastructure around the Shetrunjay Hills region —
              boundaries, roads, and transit — with access to each layer
              controlled by role.
            </p>
            <p className="max-w-[70ch]">
              Built with Next.js and MapLibre GL JS on the frontend, and a Go
              API backed by PostGIS, with permissions modelled as data rather
              than code: adding a role or layer is a database change, not a
              deploy.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShellLazy>
  );
}
