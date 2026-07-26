"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function MapPage() {
  const router = useRouter();
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API_URL}/api/layers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        // The token expires after 24h; without this the stale token sticks
        // around and every reload lands on the error state instead of login.
        if (res.status === 401) {
          clearToken();
          router.replace("/login");
          return null;
        }
        if (!res.ok) throw new Error("failed to load layers");
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setError("Could not load map layers."));
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <Map data={data} />;
}
