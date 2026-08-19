export interface TrendPoint {
  label: string
  you: number | null // percentage, 0-100
  avg: number | null
}

const WIDTH = 300
const HEIGHT = 120
const PAD_X = 8
const PAD_Y = 14

const COLOR_YOU = '#3060a8'
const COLOR_AVG = '#b5872a'

/** Small-multiple line chart: your marks vs. class average, as % of max marks, across exams. */
export default function MiniTrendChart({ points }: { points: TrendPoint[] }) {
  const usable = points.filter((p) => p.you !== null || p.avg !== null)
  if (usable.length === 0) return null

  const innerW = WIDTH - PAD_X * 2
  const innerH = HEIGHT - PAD_Y * 2
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  const xFor = (i: number) => PAD_X + i * stepX
  const yFor = (pct: number) => PAD_Y + innerH * (1 - pct / 100)

  const youPath = buildPath(points, (p) => p.you, xFor, yFor)
  const avgPath = buildPath(points, (p) => p.avg, xFor, yFor)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Marks trend chart">
      <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} stroke="#e4dcc6" strokeWidth="1" />
      {avgPath && <path d={avgPath} fill="none" stroke={COLOR_AVG} strokeWidth="2" strokeLinecap="round" />}
      {youPath && <path d={youPath} fill="none" stroke={COLOR_YOU} strokeWidth="2" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={i}>
          {p.avg !== null && (
            <circle cx={xFor(i)} cy={yFor(p.avg)} r="3" fill={COLOR_AVG}>
              <title>{`${p.label} — Class average ${p.avg.toFixed(0)}%`}</title>
            </circle>
          )}
          {p.you !== null && (
            <circle cx={xFor(i)} cy={yFor(p.you)} r="3.5" fill={COLOR_YOU}>
              <title>{`${p.label} — You ${p.you.toFixed(0)}%`}</title>
            </circle>
          )}
          <text x={xFor(i)} y={HEIGHT - 2} textAnchor="middle" fontSize="8" fill="#7c889a">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function buildPath(
  points: TrendPoint[],
  pick: (p: TrendPoint) => number | null,
  xFor: (i: number) => number,
  yFor: (pct: number) => number,
): string {
  const segments: string[] = []
  let drawing = false
  points.forEach((p, i) => {
    const v = pick(p)
    if (v === null) {
      drawing = false
      return
    }
    segments.push(`${drawing ? 'L' : 'M'} ${xFor(i)} ${yFor(v)}`)
    drawing = true
  })
  return segments.join(' ')
}

export function TrendLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-dim">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_YOU }} />
        You
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_AVG }} />
        Class average
      </span>
    </div>
  )
}
