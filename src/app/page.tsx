'use client';

import { Shell } from '@/components/layout/Shell';
import { UploadView } from '@/features/upload/views/UploadView';
import { TableView } from '@/features/table/views/TableView';
import { AnalysisView } from '@/features/analysis/views/AnalysisView';
import { ReportView } from '@/features/report/views/ReportView';
import { WorkshopView } from '@/features/workshop/views/WorkshopView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

import { DiffView } from '@/features/diff/views/DiffView';

export default function Home() {
  const activeTab = useWoznyStore((state) => state.activeTab);

  return (
    <Shell>
      {activeTab === 'upload' && <UploadView />}
      {activeTab === 'table' && <TableView />}
      {activeTab === 'analysis' && <AnalysisView />}
      {activeTab === 'report' && <ReportView />}
      {activeTab === 'workshop' && <WorkshopView />}
      {activeTab === 'diff' && <DiffView />}
    </Shell>
  );
}
