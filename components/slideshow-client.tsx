'use client';

import { useEffect, useState } from 'react';

interface SlideshowClientProps {
  photos: { id: number; name: string }[];
  accessCode?: string;
}

export default function SlideshowClient({ photos, accessCode }: SlideshowClientProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [intervalMs, setIntervalMs] = useState(5000);

  useEffect(() => {
    if (!playing || photos.length === 0) return;
    const t = setInterval(() => setIndex(i => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(t);
  }, [playing, intervalMs, photos.length]);

  if (!photos.length) {
    return <div className="h-screen w-full flex items-center justify-center text-gray-400">No approved photos yet</div>;
  }

  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const current = photos[index];

  return (
    <div className="relative h-screen w-full">
      <img
        src={`/api/photos/${current.id}${codeQuery}`}
        alt={current.name}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-xs">
        <button className="px-2 py-1 hover:bg-white/20 rounded" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <span>Every</span>
        <select className="bg-white text-black border border-white/30 rounded px-1 py-0.5 shadow" value={intervalMs} onChange={e => setIntervalMs(parseInt(e.target.value))}>
          <option value={5000}>5s</option>
          <option value={15000}>15s</option>
          <option value={30000}>30s</option>
          <option value={60000}>60s</option>
        </select>
        <span>{index + 1} / {photos.length}</span>
      </div>
    </div>
  );
}


