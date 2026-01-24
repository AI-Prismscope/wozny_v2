'use client';

import { Shell } from '@/components/layout/Shell';
import { UploadView } from '@/features/upload/views/UploadView';
import { TableView } from '@/features/table/views/TableView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

export default function Home() {
  const activeTab = useWoznyStore((state) => state.activeTab);

  return (
    <Shell>
      {activeTab === 'upload' && <UploadView />}
      {activeTab === 'table' && <TableView />}
    </Shell>
  );
}
