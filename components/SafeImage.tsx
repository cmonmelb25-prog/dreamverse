'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getPlaceholderImage } from '@/lib/placeholder';

type Props = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
};

export function SafeImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
}: Props) {
  const [failed, setFailed] = useState(false);

  const fallback = getPlaceholderImage('fallback');

  const finalSrc = !src || failed ? fallback : src;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={true}
      onError={() => setFailed(true)}
    />
  );
}