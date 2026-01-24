'use client';

import { Shell } from '@/components/layout/Shell';
import { UploadView } from '@/features/upload/views/UploadView';
import { useWoznyStore } from '@/lib/store/useWoznyStore';

export default function Home() {
  const activeTab = useWoznyStore((state) => state.activeTab);

  return (
    <Shell>
      {activeTab === 'upload' && <UploadView />}
      {activeTab === 'table' && <div className="p-8 text-center text-neutral-500">Table View (Coming Soon)</div>}
    </Shell>
  );
}
