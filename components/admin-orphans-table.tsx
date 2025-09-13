"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';

export default function AdminOrphansTable({ orphaned }: { orphaned: { key: string; size: number; lastModified?: string | Date }[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const selectedKeys = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const o of orphaned) next[o.key] = value;
    setSelected(next);
  };

  async function onDeleteSelected() {
    if (selectedKeys.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: selectedKeys }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted} object(s)`);
        // Remove deleted keys from local list
        const deletedSet = new Set<string>(data.results.filter((r: any) => r.ok).map((r: any) => r.key));
        setSelected((prev) => {
          const copy = { ...prev };
          for (const key of deletedSet) delete copy[key];
          return copy;
        });
        window.location.reload();
      } else {
        toast.error(data?.error || 'Delete failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDownloadAll() {
    const keys = orphaned.map((o) => o.key);
    if (keys.length === 0) {
      toast.info('No objects to download');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/storage/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orphans-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle>Orphaned S3 Objects</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onDownloadAll} disabled={loading || orphaned.length === 0}>Download All</Button>
          <Button variant="secondary" onClick={() => toggleAll(true)}>Select All</Button>
          <Button variant="secondary" onClick={() => toggleAll(false)}>Clear</Button>
          <Button onClick={onDeleteSelected} disabled={loading || selectedKeys.length === 0}>
            {loading ? 'Deleting…' : `Delete Selected (${selectedKeys.length})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 w-10"></th>
                <th className="py-2 pr-4">Key</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {orphaned.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-gray-500">No orphaned objects found.</td></tr>
              ) : orphaned.map((o) => (
                <tr key={o.key} className="border-b last:border-0">
                  <td className="py-2 pr-4 align-top">
                    <Checkbox checked={!!selected[o.key]} onChange={(e) => setSelected((s) => ({ ...s, [o.key]: (e.target as HTMLInputElement).checked }))} />
                  </td>
                  <td className="py-2 pr-4 font-mono break-all">{o.key}</td>
                  <td className="py-2 pr-4">{o.size}</td>
                  <td className="py-2 pr-4">{o.lastModified ? new Date(o.lastModified as any).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


