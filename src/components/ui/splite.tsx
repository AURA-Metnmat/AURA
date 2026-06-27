"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="w-full h-full" />,
});

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer the heavy WebGL/Spline bundle until the browser is idle so it never
    // blocks the interview entry's first paint or interactivity. Users who
    // prefer reduced motion get the static panel and skip the 3D entirely.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div
        aria-hidden="true"
        className={cn("w-full h-full bg-gradient-to-br from-slate-900/30 to-black/30", className)}
      />
    );
  }

  return <Spline scene={scene} className={className} />;
}
