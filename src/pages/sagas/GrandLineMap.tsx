import type { Palette, SagaStage } from '../../api/types'

interface Props {
  map: { width: number; height: number }
  stages: SagaStage[]
  active: number
  palette: Palette
  reducedMotion: boolean
}

// Mapa persistente: SVG con el sistema de coordenadas que manda la API (viewBox = map.width × map.height).
export function GrandLineMap({ map, stages, active, palette, reducedMotion }: Props) {
  const points = stages.map((s) => ({ x: s.island.x, y: s.island.y }))
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')

  // Largo acumulado de la ruta hasta cada isla. La ruta recorrida es la ruta completa
  // "recortada" con stroke-dashoffset hasta la isla activa.
  const cumulative = points.map((_, i) =>
    points.slice(1, i + 1).reduce((sum, p, j) => sum + Math.hypot(p.x - points[j].x, p.y - points[j].y), 0),
  )
  const total = Math.max(cumulative[cumulative.length - 1] ?? 0, 1)
  const traveled = cumulative[active] ?? 0
  const ship = points[active] ?? { x: 0, y: 0 }
  const transition = reducedMotion ? 'none' : undefined

  const fontSize = map.width / 45

  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      className="h-auto max-h-[30vh] w-full rounded-lg lg:max-h-none"
      role="img"
      aria-label={`Mapa del Grand Line. El barco está en ${stages[active]?.island.name ?? ''}, etapa ${active + 1} de ${stages.length}.`}
    >
      <rect width={map.width} height={map.height} fill={palette.surface} className="transition-colors duration-700" style={{ transition }} />

      {/* Ruta completa (punteada) y ruta recorrida (sólida). */}
      <path d={path} fill="none" stroke={palette.text} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="8 10" />
      <path
        d={path}
        fill="none"
        stroke={palette.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: total,
          strokeDashoffset: total - traveled,
          transition: transition ?? 'stroke-dashoffset 700ms ease, stroke 700ms ease',
        }}
      />

      {stages.map((s, i) => (
        <g key={s.id}>
          <circle
            cx={s.island.x}
            cy={s.island.y}
            r={i === active ? 14 : 10}
            fill={i <= active ? palette.primary : palette.background}
            stroke={palette.text}
            strokeWidth={2}
          />
          <text
            x={s.island.x}
            y={s.island.y + (s.island.y > map.height - 60 ? -24 : 36)}
            textAnchor="middle"
            fontSize={fontSize}
            fill={palette.text}
            fontWeight={i === active ? 700 : 400}
            opacity={i === active ? 1 : 0.7}
          >
            {s.island.name}
          </text>
        </g>
      ))}

      {/* El barco: se traslada a la isla de la etapa activa. */}
      <g
        style={{
          transform: `translate(${ship.x}px, ${ship.y}px)`,
          transition: transition ?? 'transform 700ms ease',
        }}
        aria-hidden="true"
      >
        <g transform="translate(0 -30)">
          <path d="M-22 6 L22 6 L14 18 L-14 18 Z" fill={palette.accent} stroke={palette.text} strokeWidth={2} />
          <line x1={0} y1={6} x2={0} y2={-24} stroke={palette.text} strokeWidth={3} />
          <path d="M2 -22 L20 2 L2 2 Z" fill={palette.text} />
        </g>
      </g>
    </svg>
  )
}
