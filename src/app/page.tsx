"use client";

// Importing rehydrateSession also activates the write-path subscriber
// (module-level side-effect in persistence.ts).
import { rehydrateSession } from "@/lib/db/persistence";

import React, { useEffect, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { UploadView } from "@/features/upload/views/UploadView";
import { AskWoznyView } from "@/features/ask-wozny/views/AskWoznyView";
import { AnalysisView } from "@/features/analysis/views/AnalysisView";
import { ReportView } from "@/features/report/views/ReportView";
import { WorkshopView } from "@/features/workshop/views/WorkshopView";
import { useWoznyStore } from "@/lib/store/useWoznyStore";
import { DiffView } from "@/features/diff/views/DiffView";
import { AboutView } from "@/features/about/views/AboutView";
import { StatusView } from "@/features/status/views/StatusView";

export default function Home() {
  const [isRehydrating, setIsRehydrating] = useState(true);
  const activeTab = useWoznyStore((state) => state.activeTab);

  useEffect(() => {
    rehydrateSession()
      .catch((err) => console.error("[app] Rehydration failed:", err))
      .finally(() => setIsRehydrating(false));
  }, []);

  if (isRehydrating) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-400">
            Restoring your session…
          </p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      {activeTab === "upload" && <UploadView />}
      {activeTab === "analysis" && <AnalysisView />}
      {activeTab === "report" && <ReportView />}
      {activeTab === "workshop" && <WorkshopView />}
      {activeTab === "ask-wozny" && <AskWoznyView />}
      {activeTab === "diff" && <DiffView />}
      {activeTab === "about" && <AboutView />}
      {activeTab === "status" && <StatusView />}
    </Shell>
  );
}
