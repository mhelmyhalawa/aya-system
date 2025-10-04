import React from 'react';

interface SparkTrendProps {
  values: number[]; // expected 0-100
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  areaOpacity?: number;
  'aria-label'?: string;
  showLastValue?: boolean;
  color?: string; // tailwind color class suffix e.g. 'green-600'
}

// Generates path d attribute for an array of values scaled to width/height
function buildPath(values: number[], w: number, h: number): string {
  if (!values.length) return '';
  const step = w / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / 100) * h; // invert
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

export const SparkTrend: React.FC<SparkTrendProps> = ({
  values,
  width = 120,
  height = 46,
  strokeWidth = 2,
  className = '',
  areaOpacity = 0.18,
  showLastValue = true,
  color = 'green-600',
  ...rest
}) => {
  const data = values.slice(-12); // limit
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-[10px] h-[${height}px] rounded-md border border-dashed border-border/40 text-muted-foreground/60 ${className}`}>
        لا بيانات
      </div>
    );
  }
  const w = width;
  const h = height - 8; // padding for marker
  const path = buildPath(data, w, h);

  // area path (close to bottom)
  const areaPath = path
    ? `${path} L ${w},${h} L 0,${h} Z`
    : '';

  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : last;
  const delta = last - prev;
  const step = w / Math.max(data.length - 1, 1);
  const lastX = (data.length - 1) * step;
  const lastY = h - (last / 100) * h;

  const up = delta > 0;
  const flat = delta === 0;

  const strokeColor = `stroke-${color}`;
  const fillColor = `fill-${color.replace('-600','-500')}`;

  return (
    <div
      className={`relative flex items-center gap-2 ${className}`}
      role="img"
      aria-label={rest['aria-label'] || 'مخطط اتجاه الأداء'}
      style={{ direction: 'rtl' }}
    >
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <g transform="translate(0,4)">
          {areaPath && (
            <path
              d={areaPath}
              className={`${fillColor}`}
              style={{ opacity: areaOpacity }}
            />
          )}
          <path
            d={path}
            className={`${strokeColor} fill-none`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Last point marker */}
            <circle
              cx={lastX}
              cy={lastY}
              r={4}
              className={`fill-white ${strokeColor}`}
              strokeWidth={2}
            />
        </g>
      </svg>
      {showLastValue && (
        <div className="flex flex-col items-start leading-tight text-[10px] select-none">
          <span className="font-bold text-gray-800">{last}%</span>
          <span className={`flex items-center gap-0.5 font-medium ${up ? 'text-green-600' : flat ? 'text-gray-400' : 'text-red-600'}`}>
            {flat ? '↔' : up ? '▲' : '▼'} {Math.abs(delta)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SparkTrend;
