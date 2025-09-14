"use client";

import { useEffect, useState } from 'react';

export function MinimizeToggle({ storageKey }: { storageKey: string }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem(storageKey); if (v === '1') setCollapsed(true); } catch {}
  }, [storageKey]);
  return (
    <button
      type="button"
      className="text-sm text-slate-700 hover:text-slate-900"
      onClick={() => {
        setCollapsed((c) => {
          const next = !c; try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch {} return next;
        });
      }}
    >
      {collapsed ? 'Expand' : 'Minimize'}
    </button>
  );
}

export function CollapsibleSection({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem(storageKey); if (v === '1') setCollapsed(true); } catch {}
  }, [storageKey]);
  useEffect(() => {
    const handler = () => {
      try { const v = localStorage.getItem(storageKey); setCollapsed(v === '1'); } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageKey]);
  return collapsed ? null : <>{children}</>;
}

export function CollapsibleCard({ title, storageKey, children, gradientClass }: { title: string; storageKey: string; children: React.ReactNode; gradientClass?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(storageKey); if (v === '1') setCollapsed(true); } catch {} }, [storageKey]);
  return (
    <div className={`${gradientClass || ''} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="text-sm text-slate-700 hover:text-slate-900"
            onClick={() => {
              setCollapsed((c) => { const next = !c; try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch {} return next; });
            }}
          >
            {collapsed ? 'Expand' : 'Minimize'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}


