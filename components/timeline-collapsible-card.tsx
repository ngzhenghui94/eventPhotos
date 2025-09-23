"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  title: string;
  storageKey: string;
  icon?: React.ReactNode;
  gradientClass?: string;
  children: React.ReactNode;
  onCollapsedChange?: (collapsed: boolean) => void;
  headerExtras?: React.ReactNode;
};

export default function TimelineCollapsibleCard({ title, storageKey, icon, gradientClass, children, onCollapsedChange, headerExtras }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      const initial = v === '1';
      setCollapsed(initial);
    } catch {
      // ignore
    }
  }, [storageKey, onCollapsedChange]);

  // Notify parent after collapsed state changes to avoid setState during render in another component
  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  return (
    <div className={`rounded-xl border border-blue-200 bg-gradient-to-r from-blue-100 via-red-50 to-orange-100 shadow-sm px-6 py-6 ${gradientClass || ''}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 rounded-full p-2">
            {icon}
          </span>
          <span role="heading" aria-level={2} className="font-bold text-2xl text-blue-900">{title}</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {headerExtras ? (
            <div className="shrink-0">{headerExtras}</div>
          ) : null}
          <button
          type="button"
          className="inline-flex items-center text-sm text-blue-800 hover:text-blue-900 w-full sm:w-auto justify-center"
          aria-expanded={!collapsed}
          onClick={() => {
            setCollapsed((prev) => {
              const next = !prev;
              try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch {}
              return next;
            });
          }}
          >
            {collapsed ? (<><ChevronDown className="h-4 w-4 mr-1"/> Expand</>) : (<><ChevronUp className="h-4 w-4 mr-1"/> Minimize</>)}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}


