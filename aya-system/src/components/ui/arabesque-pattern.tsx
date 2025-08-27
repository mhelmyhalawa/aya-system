import React from 'react';
import { cn } from '@/lib/utils';

interface ArabesquePatternProps {
  className?: string;
  color?: string;
  opacity?: number;
}

export function ArabesquePattern({ 
  className, 
  color = "#D4AF37", 
  opacity = 0.15 
}: ArabesquePatternProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-[var(--opacity)] scale-150"
        style={{ "--opacity": opacity } as React.CSSProperties}
      >
        <pattern
          id="arabesquePattern"
          patternUnits="userSpaceOnUse"
          width="50"
          height="50"
          patternTransform="scale(0.5) rotate(0)"
        >
          <path
            d="M10,10 Q15,5 20,10 T30,10 M5,20 Q10,15 15,20 T25,20 M20,25 Q25,20 30,25 T40,25"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            strokeLinecap="round"
          />
          <path
            d="M30,40 Q35,35 40,40 T50,40 M25,30 Q30,25 35,30 T45,30"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            strokeLinecap="round"
          />
          <circle cx="25" cy="25" r="1" fill={color} />
          <circle cx="35" cy="35" r="1" fill={color} />
          <circle cx="15" cy="15" r="1" fill={color} />
          <circle cx="45" cy="15" r="1" fill={color} />
        </pattern>
        <rect width="100%" height="100%" fill="url(#arabesquePattern)" />
      </svg>
    </div>
  );
}
