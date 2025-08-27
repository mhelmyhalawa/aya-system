import React from 'react';
import { cn } from '@/lib/utils';

interface IslamicArchProps {
  className?: string;
}

export function IslamicArch({ className }: IslamicArchProps) {
  return (
    <div className={cn("w-full relative", className)}>
      <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden">
        <div className="absolute inset-0 flex justify-center">
          <svg
            width="100%"
            height="32"
            viewBox="0 0 100 16"
            preserveAspectRatio="none"
            className="opacity-20"
          >
            <path
              d="M0,16 L0,8 C10,0 30,-2 50,8 C70,-2 90,0 100,8 L100,16 Z"
              fill="#D4AF37"
            />
            <path
              d="M0,16 L0,8 C10,2 30,0 50,8 C70,0 90,2 100,8 L100,16"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
