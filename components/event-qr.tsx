"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  code: string;
  className?: string;
  size?: number;
  compact?: boolean;
};

export function EventQr({ code, className, size = 192, compact = false }: Props) {
  // Start with a stable SSR value to avoid hydration mismatches, then upgrade on mount
  const [url, setUrl] = useState<string>(() => `/guest/${code}`);
  useEffect(() => {
    try {
      const origin = window.location.origin;
      setUrl(`${origin}/guest/${code}`);
    } catch {
      // in non-browser contexts, keep the relative path
    }
  }, [code]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  // Lightweight QR without deps: use quickchart.io proxy that renders QR PNG
  const qrSrc = useMemo(() => {
    const encoded = encodeURIComponent(url);
    // quickchart.io supports simple QR generation via query params
    return `https://quickchart.io/qr?text=${encoded}&size=${size}`;
  }, [url, size]);

  return (
    <div className={className}>
      <div className={`flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className={`${compact ? 'p-2 rounded-lg' : 'p-3 rounded-xl'} border bg-white`}>
          <img src={qrSrc} alt="Event QR code" width={size} height={size} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className={compact ? 'h-7 px-2 py-1 text-xs' : ''} onClick={copyLink}>Copy link</Button>
          <a href={qrSrc} download={`event-${code}-qr.png`}>
            <Button size="sm" className={compact ? 'h-7 px-2 py-1 text-xs' : ''} variant="outline">Download PNG</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
