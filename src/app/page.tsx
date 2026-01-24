'use client';

import { Shell } from '@/components/layout/Shell';
import { UploadView } from '@/features/upload/views/UploadView';
import { TableView } from '@/features/table/views/TableView';
import { AnalysisView } from '@/features/analysis/views/AnalysisView';
import { ReportView } from '@/features/report/views/ReportView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

export default function Home() {
  const activeTab = useWoznyStore((state) => state.activeTab);

  return (
    <Shell>
      {activeTab === 'upload' && <UploadView />}
      {activeTab === 'table' && <TableView />}
      {activeTab === 'analysis' && <AnalysisView />}
      {activeTab === 'report' && <ReportView />}
      {activeTab === 'workshop' && <div className="p-8 text-center text-neutral-500">Workshop Coming Soon</div>}
    </Shell>
  );
}
