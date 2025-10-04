import React from 'react';

interface SparkBarsProps {
  values: number[]; // 0 - 100 expected
  height?: number; // bar height in px
  className?: string;
  barClassName?: string;
  tooltipFormatter?: (value: number, index: number) => string;
  // Accessible label describing the dataset
  'aria-label'?: string;
}

// Utility to map value to color bucket (semantic w/out extra palette config)
function valueColor(v: number) {
  if (v >= 90) return 'bg-green-600';
  if (v >= 80) return 'bg-green-500';
  if (v >= 70) return 'bg-yellow-500';
  if (v >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

export const SparkBars: React.FC<SparkBarsProps> = ({
  values,
  height = 36,
  className = '',
  barClassName = '',
  tooltipFormatter,
  ...rest
}) => {
  const max = 100; // fixed scale for consistency
  const safeValues = (values || []).slice(-12); // cap length for layout

  if (!safeValues.length) {
    return (
      <div
        className={`flex items-center justify-center text-[10px] text-muted-foreground/70 h-[${height}px] rounded-md border border-dashed border-border/40 bg-muted/30 ${className}`}
        aria-label={rest['aria-label'] || 'لا توجد بيانات'}
      >
        لا بيانات
      </div>
    );
  }

  return (
    <div
      className={`flex gap-1 items-end px-1 py-1 rounded-lg bg-white/70 backdrop-blur border border-border/40 shadow-sm ${className}`}
      style={{ direction: 'rtl', height }}
      role="img"
      aria-label={rest['aria-label'] || 'مخطط شريطي مصغر للأداء'}
    >
      {safeValues.map((v, i) => {
        const h = Math.max(4, (v / max) * (height - 8));
        return (
          <div
            key={i}
            className={`group relative flex-1 rounded-sm ${valueColor(v)} ${barClassName}`}
            style={{ height: h }}
            aria-hidden="true"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-white shadow">
              {tooltipFormatter ? tooltipFormatter(v, i) : `${v}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SparkBars;
