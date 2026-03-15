import { Suspense } from 'react';
import AdminPageContent from './AdminPageContent';

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-text-muted">Loading…</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
