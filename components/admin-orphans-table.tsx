"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export default function AdminOrphansTable({ orphaned }: { orphaned: { key: string; size: number; lastModified?: string | Date }[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selectedKeys = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    if (value) {
      for (const o of orphaned) next[o.key] = value;
    }
    setSelected(next);
  };

  async function onDeleteSelected() {
    if (selectedKeys.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: selectedKeys }),
      });
      const data = await res.json();
      if (res.ok || res.status === 207) {
        if (data.deleted) toast.success(`Deleted ${data.deleted} object(s)`);
        if (data.failed) {
          toast.error(`${data.failed} object(s) failed to delete`);
          console.warn('Delete failures:', data.errors);
        }
        window.location.reload();
      } else {
        toast.error(data?.error || 'Delete failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function onDownloadAll() {
    const keys = orphaned.map((o) => o.key);
    if (keys.length === 0) {
      toast.info('No objects to download');
      return;
    }
    setDownloading(true);
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
      setDownloading(false);
    }
  }

  // Delete ALL orphaned objects without requiring selection (with confirmation)
  async function onDeleteAll() {
    if (orphaned.length === 0) return;
    const proceed = window.confirm(`Delete all ${orphaned.length} orphaned object(s)? This cannot be undone.`);
    if (!proceed) return;
    setDeleting(true);
    try {
      const allKeys = orphaned.map(o => o.key);
      const batchSize = 200; // Avoid very large payloads
      let totalDeleted = 0;
      let totalFailed = 0;
      for (let i = 0; i < allKeys.length; i += batchSize) {
        const slice = allKeys.slice(i, i + batchSize);
        const res = await fetch('/api/admin/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: slice }),
        });
        const data = await res.json();
        if (res.ok || res.status === 207) {
          totalDeleted += data.deleted || 0;
          totalFailed += data.failed || 0;
        } else {
            toast.error(data?.error || `Batch delete failed at ${i}/${allKeys.length}`);
            break;
        }
      }
      if (totalDeleted) toast.success(`Deleted ${totalDeleted} object(s)`);
      if (totalFailed) toast.error(`${totalFailed} object(s) failed to delete`);
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle>Orphaned S3 Objects</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onDownloadAll} disabled={downloading || orphaned.length === 0}>
            {downloading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading…
              </span>
            ) : 'Download All'}
          </Button>
          <Button variant="destructive" onClick={onDeleteAll} disabled={deleting || downloading || orphaned.length === 0}>
            {deleting ? 'Deleting…' : `Delete All (${orphaned.length})`}
          </Button>
          <Button variant="secondary" onClick={() => toggleAll(true)}>Select All</Button>
          <Button variant="secondary" onClick={() => toggleAll(false)}>Clear</Button>
          <Button onClick={onDeleteSelected} disabled={deleting || downloading || selectedKeys.length === 0}>
            {deleting ? 'Deleting…' : `Delete Selected (${selectedKeys.length})`}
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
                    <Checkbox
                      checked={!!selected[o.key]}
                      onChange={(e) => {
                        setSelected((s) => ({ ...s, [o.key]: e.target.checked }));
                      }}
                    />
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


