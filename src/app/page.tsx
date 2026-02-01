'use client';

import { Shell } from '@/components/layout/Shell';
import { UploadView } from '@/features/upload/views/UploadView';
import { AskWoznyView } from '@/features/ask-wozny/views/AskWoznyView';
import { AnalysisView } from '@/features/analysis/views/AnalysisView';
import { ReportView } from '@/features/report/views/ReportView';
import { WorkshopView } from '@/features/workshop/views/WorkshopView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

import { DiffView } from '@/features/diff/views/DiffView';

import { AboutView } from '@/features/about/views/AboutView';
import { StatusView } from '@/features/status/views/StatusView';

export default function Home() {
  const activeTab = useWoznyStore((state) => state.activeTab);

  return (
    <Shell>
      {activeTab === 'upload' && <UploadView />}
      {activeTab === 'analysis' && <AnalysisView />}
      {activeTab === 'report' && <ReportView />}
      {activeTab === 'workshop' && <WorkshopView />}
      {activeTab === 'ask-wozny' && <AskWoznyView />}
      {activeTab === 'diff' && <DiffView />}
      {activeTab === 'about' && <AboutView />}
      {activeTab === 'status' && <StatusView />}
    </Shell>
  );
}
