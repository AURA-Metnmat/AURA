"use client";

import { Monitor, Laptop } from "lucide-react";
import { DESKTOP_MIN_WIDTH_PX } from "@/lib/interview/consent";

interface DesktopOnlyGateProps {
  companyName: string;
}

export function DesktopOnlyGate({ companyName }: DesktopOnlyGateProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full rounded-2xl border border-amber-500/20 bg-slate-950/80 p-8 text-center shadow-xl">
        <div className="flex justify-center gap-3 mb-6 text-amber-400">
          <Laptop className="w-10 h-10" />
          <Monitor className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-3">Larger screen required</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          This interview for <span className="text-slate-200 font-medium">{companyName}</span> works
          best on a laptop, desktop, or tablet in landscape. Voice input, structured questions, and
          file uploads need a comfortable screen size.
        </p>
        <p className="text-sm text-amber-200/90 bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-3">
          Please use a device with screen width at least {DESKTOP_MIN_WIDTH_PX}px (tablet landscape
          or computer).
        </p>
      </div>
    </div>
  );
}
