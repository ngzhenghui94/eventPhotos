'use client';

import { useEffect, useState } from 'react';

interface InlineSlideshowProps {
  photos: { id: number; name: string }[];
  accessCode?: string;
  height?: number; // pixels
  intervalMs?: number;
}

export default function InlineSlideshow({ photos, accessCode, height = 320, intervalMs = 4000 }: InlineSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || photos.length === 0) return;
    const t = setInterval(() => setIndex(i => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(t);
  }, [playing, intervalMs, photos.length]);

  if (photos.length === 0) {
    return <div className="w-full flex items-center justify-center text-gray-400" style={{ height }}>{'No photos yet'}</div>;
  }

  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const current = photos[index];

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ height }}>
      <img
        src={`/api/photos/${current.id}${codeQuery}`}
        alt={current.name}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[10px] bg-white/15 backdrop-blur px-2 py-1 rounded-full text-white">
        <button className="px-2 py-0.5 hover:bg-white/20 rounded" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <span>{index + 1}/{photos.length}</span>
      </div>
    </div>
  );
}


