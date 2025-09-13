import React from 'react';

type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function BrandMark({ size = 32, className = '', title = 'The Crowd Grid' }: BrandMarkProps) {
  const px = `${size}px`;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 256 256"
      aria-label={title}
      role="img"
      className={className}
    >
      <defs>
        <linearGradient id="tcg-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="48" fill="url(#tcg-g)" />
      <g fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
        <path d="M48 64h160M48 128h160M48 192h160" />
        <path d="M64 48v160M128 48v160M192 48v160" />
      </g>
      <circle cx="196" cy="60" r="14" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export default BrandMark;


