import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos, events, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedDownloadUrl, deleteFromS3 } from '@/lib/s3';
import React, { useState } from 'react';


export default async function AdminPhotosPage() {
  await requireSuperAdmin();

  // List all objects in Hetzner S3 bucket
  const s3Client = new S3Client({
    region: process.env.HETZNER_S3_REGION,
    endpoint: process.env.HETZNER_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.HETZNER_S3_ACCESS_KEY!,
      secretAccessKey: process.env.HETZNER_S3_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
  const bucket = process.env.HETZNER_S3_BUCKET;
  const listCommand = new ListObjectsV2Command({ Bucket: bucket });
  const s3List = await s3Client.send(listCommand);
  const objects = s3List.Contents || [];

  // Prefetch signed URLs for all objects
  const signedUrls: Record<string, string> = {};
  await Promise.all(objects.map(async (obj) => {
    if (obj.Key) {
      signedUrls[obj.Key] = await getSignedDownloadUrl(obj.Key);
    }
  }));

  // Gallery View toggle state (client only)
  // Use a simple query param for SSR toggle
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const galleryMode = searchParams?.get('view') === 'gallery';

  // Helper to build toggle URL
  function getToggleUrl() {
    if (galleryMode) {
      return '?view=bucket';
    } else {
      return '?view=gallery';
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">Photo {galleryMode ? 'Gallery View' : 'Bucket Manager'}</h1>
      <div className="mb-4">
        <Link href={getToggleUrl()}>
          <Button variant="outline">
            Switch to {galleryMode ? 'Bucket Manager' : 'Gallery View'}
          </Button>
        </Link>
      </div>
      {galleryMode ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {objects.map((obj) => (
            <div key={obj.Key} className="relative group border rounded-lg overflow-hidden shadow">
              <a href={signedUrls[obj.Key!]} target="_blank" rel="noopener noreferrer">
                <img src={signedUrls[obj.Key!]} alt={obj.Key!} className="w-full h-40 object-cover" />
              </a>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <form action={`/api/admin/photos/delete?key=${encodeURIComponent(obj.Key!)}`} method="post">
                  <Button size="icon" variant="destructive" title="Delete" className="p-2">🗑️</Button>
                </form>
                <a href={signedUrls[obj.Key!]} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="outline" title="View" className="p-2">🔍</Button>
                </a>
              </div>
              <div className="p-2 text-xs text-gray-700 bg-white bg-opacity-80 absolute bottom-0 w-full">
                <div className="truncate">{obj.Key}</div>
                <div>Size: {obj.Size} bytes</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {objects.map((obj) => (
            <Card key={obj.Key}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{obj.Key}</CardTitle>
                <form action={`/api/admin/photos/delete?key=${encodeURIComponent(obj.Key!)}`} method="post" className="inline">
                  <Button size="sm" variant="destructive">Delete</Button>
                </form>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <a href={signedUrls[obj.Key!]} target="_blank" rel="noopener noreferrer">
                    <img src={signedUrls[obj.Key!]} alt={obj.Key!} className="w-32 h-32 object-cover rounded shadow" />
                  </a>
                  <div>
                    <div>Size: {obj.Size} bytes</div>
                    <div>Last Modified: {obj.LastModified?.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
