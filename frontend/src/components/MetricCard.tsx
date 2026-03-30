import { clsx } from 'clsx'

interface MetricCardProps {
  label: string
  value: string | number | null | undefined
  unit?: string
  sub?: string
  device?: 'whoop' | 'garmin'
  color?: string
  large?: boolean
}

export function MetricCard({ label, value, unit, sub, device, color, large }: MetricCardProps) {
  const deviceColor = device === 'whoop' ? '#FF3B5C' : device === 'garmin' ? '#4FC3F7' : color

  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-2"
      style={{ background: '#141923', borderColor: '#1e2535' }}
    >
      <div className="flex items-center gap-2">
        {deviceColor && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: deviceColor }} />
        )}
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7990' }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        {value != null ? (
          <>
            <span
              className={clsx('font-bold tabular-nums', large ? 'text-3xl' : 'text-2xl')}
              style={{ color: deviceColor || 'white' }}
            >
              {value}
            </span>
            {unit && <span className="text-sm" style={{ color: '#6b7990' }}>{unit}</span>}
          </>
        ) : (
          <span className="text-xl font-bold" style={{ color: '#2a3448' }}>—</span>
        )}
      </div>
      {sub && <p className="text-xs" style={{ color: '#6b7990' }}>{sub}</p>}
    </div>
  )
}
