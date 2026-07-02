"use client";

import { EXERCISE_RADAR_CATEGORY, RADAR_AXES, type RadarAxis } from '@/data/radarCategories';

interface Exercise {
  exerciseId: string;
  level: number;
  expired: boolean;
}

interface Props {
  exercises: Exercise[];
  accentColor?: string; // tailwind fill class or hex
}

/**
 * Compact 4-axis radar chart showing average rank level per category.
 * Designed for inline use in the Bestiary view on Power Level screen.
 */
export default function BestiaryRadar({ exercises, accentColor = '#f97316' }: Props) {
  // Compute average level per axis (only count non-expired, level > 0 for shape)
  const axisTotals: Record<RadarAxis, { sum: number; count: number }> = {
    STR: { sum: 0, count: 0 },
    END: { sum: 0, count: 0 },
    PWR: { sum: 0, count: 0 },
    MOB: { sum: 0, count: 0 },
  };

  for (const ex of exercises) {
    // Strip equipment prefix to match mapping
    const baseId = ex.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
    const axis = EXERCISE_RADAR_CATEGORY[baseId];
    if (!axis) continue;
    axisTotals[axis].count++;
    if (!ex.expired) {
      axisTotals[axis].sum += ex.level;
    }
  }

  const axisValues = RADAR_AXES.map(axis => {
    const { sum } = axisTotals[axis];
    return sum; // Sum of levels per axis (shows where PL comes from)
  });

  // Max possible per axis = count × 5 (all Lv5)
  const axisMax = RADAR_AXES.map(axis => axisTotals[axis].count * 5);
  const globalMax = Math.max(...axisMax, 1); // Use the largest axis as the scale

  // SVG geometry: 4 axes at 90° intervals (top, right, bottom, left)
  // Axes order: STR(top), END(right), PWR(bottom), MOB(left)
  const cx = 50;
  const cy = 50;
  const maxR = 38; // max radius

  // Angles: STR=top(-90°), END=right(0°), PWR=bottom(90°), MOB=left(180°)
  const angles = [-90, 0, 90, 180];

  const getPoint = (angleIdx: number, value: number) => {
    const r = (value / globalMax) * maxR;
    const rad = (angles[angleIdx] * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Shape polygon points
  const shapePoints = axisValues
    .map((v, i) => {
      const p = getPoint(i, v);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  // Grid rings at 33% and 66% of max
  const gridLevels = [Math.round(globalMax * 0.33), Math.round(globalMax * 0.66), globalMax];

  // Axis labels with values - positioned outside the chart area
  // STR (top) and PWR (bottom) horizontal, END (right) and MOB (left) vertical
  const labelPositions: { axis: string; fullName: string; x: number; y: number; anchor: 'start' | 'middle' | 'end'; rotate?: number }[] = [
    { axis: 'STR', fullName: 'Strength', x: cx, y: -4, anchor: 'middle' },
    { axis: 'END', fullName: 'Endurance', x: 97, y: cx, anchor: 'middle', rotate: 90 },
    { axis: 'PWR', fullName: 'Power', x: cx, y: 108, anchor: 'middle' },
    { axis: 'MOB', fullName: 'Mobility', x: 3, y: cx, anchor: 'middle', rotate: -90 },
  ];

  return (
    <div className="flex justify-center py-2">
      <svg viewBox="-15 -15 130 130" className="w-44 h-44" preserveAspectRatio="xMidYMid meet">
        {/* Grid rings */}
        {gridLevels.map(level => {
          const r = (level / 5) * maxR;
          const pts = angles
            .map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="#27272a"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {angles.map((_, i) => {
          const p = getPoint(i, 5);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="#27272a"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Data shape */}
        <polygon
          points={shapePoints}
          fill={accentColor}
          fillOpacity={0.25}
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {axisValues.map((v, i) => {
          const p = getPoint(i, v);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill={accentColor}
            />
          );
        })}

        {/* Labels */}
        {labelPositions.map((lp, i) => (
          <g key={lp.axis} transform={lp.rotate ? `rotate(${lp.rotate}, ${lp.x}, ${lp.y})` : undefined}>
            <text
              x={lp.x}
              y={lp.y}
              fontSize="5.5"
              fill="#e4e4e7"
              textAnchor={lp.anchor}
              fontWeight="bold"
              style={{ fontFamily: 'var(--font-pixel), monospace' }}
            >
              {lp.fullName}
            </text>
            <text
              x={lp.x}
              y={lp.y + 7}
              fontSize="5"
              fill={accentColor}
              textAnchor={lp.anchor}
              style={{ fontFamily: 'var(--font-pixel), monospace' }}
            >
              {axisValues[i].toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
