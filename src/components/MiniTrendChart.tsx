export interface TrendPoint {
  label: string
  you: number | null // percentage, 0-100
  avg: number | null
}

const W = 700
const H = 220
const PAD_X = 36
const PAD_Y = 18

/** Line chart matching the redesign's exact chart spec: your marks vs. class average, as % of max marks. */
export default function MiniTrendChart({ points }: { points: TrendPoint[] }) {
  const usable = points.filter((p) => p.you !== null || p.avg !== null)
  if (usable.length === 0) return null

  const stepX = points.length > 1 ? (W - PAD_X * 2) / (points.length - 1) : 0
  const x = (i: number) => PAD_X + i * stepX
  const y = (v: number) => H - PAD_Y - (v / 100) * (H - PAD_Y * 2)

  const path = (values: (number | null)[]) => {
    const segments: string[] = []
    let drawing = false
    values.forEach((v, i) => {
      if (v === null) {
        drawing = false
        return
      }
      segments.push(`${drawing ? 'L' : 'M'} ${x(i)} ${y(v)}`)
      drawing = true
    })
    return segments.join(' ')
  }

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progress chart">
      {[0, 25, 50, 75, 100].map((v) => (
        <line key={v} x1={PAD_X} x2={W - PAD_X} y1={y(v)} y2={y(v)} className="gridline" />
      ))}
      <path d={path(points.map((p) => p.avg))} className="avg-line" />
      <path d={path(points.map((p) => p.you))} className="value-line" />
      {points.map((p, i) => (
        <g key={i}>
          {p.you !== null && (
            <>
              <circle cx={x(i)} cy={y(p.you)} r="7" className="value-dot" />
              <text x={x(i)} y={y(p.you) - 15} className="value-label">
                {Math.round(p.you)}%
              </text>
            </>
          )}
          {p.avg !== null && <circle cx={x(i)} cy={y(p.avg)} r="6" className="avg-dot" />}
        </g>
      ))}
      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 2} className="axis-label">
          {p.label}
        </text>
      ))}
    </svg>
  )
}
