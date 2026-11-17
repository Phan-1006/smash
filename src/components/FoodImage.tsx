import { useState } from 'react';
import { Utensils } from 'lucide-react';

interface FoodImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function FoodImage({ src, alt, className = '' }: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex flex-col items-center justify-center text-zinc-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils className="w-7 h-7 mb-2 text-zinc-400" strokeWidth={1.5} />
        <span className="text-xs font-medium text-zinc-600 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
