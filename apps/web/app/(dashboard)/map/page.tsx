"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getToken } from "@/lib/auth";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function MapPage() {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API_URL}/api/layers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("failed to load layers");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Could not load map layers."));
  }, []);

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
