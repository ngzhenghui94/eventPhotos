'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Pause, Play, X } from 'lucide-react';

interface InlineSlideshowProps {
  photos: { id: number; name: string }[];
  accessCode?: string;
  height?: number; // pixels
  intervalMs?: number;
}

export default function InlineSlideshow({ photos, accessCode, height = 320, intervalMs = 4000 }: InlineSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!playing || photos.length === 0) return;
    const t = setInterval(() => setIndex(i => (i + 1) % photos.length), intervalMs);
    return () => clearInterval(t);
  }, [playing, intervalMs, photos.length]);

  const goNext = useCallback(() => setIndex(i => (i + 1) % photos.length), [photos.length]);
  const goPrev = useCallback(() => setIndex(i => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!photos.length) return;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFullscreen(f => !f);
      } else if (e.key === 'Escape' && fullscreen) {
        e.preventDefault();
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, fullscreen, photos.length]);

  if (photos.length === 0) {
    return <div className="w-full flex items-center justify-center text-gray-400" style={{ height }}>{'No photos yet'}</div>;
  }

  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const current = photos[index];

  const Body = (
    <div className={`relative w-full overflow-hidden bg-black ${fullscreen ? '' : 'rounded-lg'}`} style={{ height: fullscreen ? '100vh' : height }}>
      <img
        src={`/api/photos/${current.id}${codeQuery}`}
        alt={current.name}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {/* Bottom controls */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] bg-white/15 backdrop-blur px-2 py-1 rounded-full text-white shadow">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-white hover:bg-white/20" onClick={() => setPlaying(p => !p)}>
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <span className="tabular-nums">{index + 1}/{photos.length}</span>
        <span className="mx-1 opacity-60">•</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-white hover:bg-white/20"
          onClick={() => setFullscreen(f => !f)}
          title={fullscreen ? 'Minimize (Esc)' : 'Maximize (F)'}
          aria-label={fullscreen ? 'Minimize' : 'Maximize'}
        >
          {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button>
      </div>

      {/* Close in fullscreen */}
      {fullscreen && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white"
          onClick={() => setFullscreen(false)}
          aria-label="Close fullscreen"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (!fullscreen) return Body;
  return (
    <div className="fixed inset-0 z-[60] bg-black">{Body}</div>
  );
}


