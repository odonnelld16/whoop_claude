import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { HRPoint, HRStats } from '../../types'

interface Props {
  whoop: HRPoint[]
  garmin: HRPoint[]
  stats: HRStats
}

interface AlignedPoint {
  time: number
  whoop?: number
  garmin?: number
}

function alignByMinute(whoop: HRPoint[], garmin: HRPoint[]): AlignedPoint[] {
  const map = new Map<number, AlignedPoint>()

  for (const p of whoop) {
    const key = Math.floor(p.ts / 60000) * 60000
    if (!map.has(key)) map.set(key, { time: key })
    const entry = map.get(key)!
    entry.whoop = entry.whoop ? Math.round((entry.whoop + p.bpm) / 2) : p.bpm
  }

  for (const p of garmin) {
    const key = Math.floor(p.ts / 60000) * 60000
    if (!map.has(key)) map.set(key, { time: key })
    const entry = map.get(key)!
    entry.garmin = entry.garmin ? Math.round((entry.garmin + p.bpm) / 2) : p.bpm
  }

  return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const whoop = payload.find((p: any) => p.dataKey === 'whoop')?.value
  const garmin = payload.find((p: any) => p.dataKey === 'garmin')?.value
  const diff = whoop != null && garmin != null ? Math.abs(whoop - garmin) : null

  return (
    <div
      className="rounded-xl border p-3 text-sm shadow-2xl"
      style={{ background: '#141923', borderColor: '#1e2535', minWidth: 160 }}
    >
      <p className="mb-2 font-medium" style={{ color: '#6b7990' }}>
        {format(new Date(label), 'h:mm a')}
      </p>
      {whoop != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF3B5C' }} />
          <span style={{ color: '#FF3B5C' }} className="font-semibold">{whoop} bpm</span>
          <span style={{ color: '#6b7990' }}>WHOOP</span>
        </div>
      )}
      {garmin != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4FC3F7' }} />
          <span style={{ color: '#4FC3F7' }} className="font-semibold">{garmin} bpm</span>
          <span style={{ color: '#6b7990' }}>Garmin</span>
        </div>
      )}
      {diff != null && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: '#1e2535' }}>
          <span style={{ color: diff <= 5 ? '#34D399' : diff <= 10 ? '#FBBF24' : '#F87171' }}>
            Δ {diff} bpm
          </span>
        </div>
      )}
    </div>
  )
}

export function HRComparisonChart({ whoop, garmin, stats }: Props) {
  const data = alignByMinute(whoop, garmin)

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border" style={{ borderColor: '#1e2535', color: '#6b7990' }}>
        No heart rate data for this date. Try syncing first.
      </div>
    )
  }

  const allBpms = data.flatMap(d => [d.whoop, d.garmin].filter(Boolean) as number[])
  const minBpm = Math.max(30, Math.min(...allBpms) - 10)
  const maxBpm = Math.min(220, Math.max(...allBpms) + 10)

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'WHOOP Avg', value: stats.whoop_avg, color: '#FF3B5C', unit: 'bpm' },
          { label: 'Garmin Avg', value: stats.garmin_avg, color: '#4FC3F7', unit: 'bpm' },
          { label: 'Avg Difference', value: stats.avg_diff, color: stats.avg_diff != null && stats.avg_diff <= 5 ? '#34D399' : '#FBBF24', unit: 'bpm' },
          { label: 'Agreement', value: stats.agreement_pct, color: stats.agreement_pct != null && stats.agreement_pct >= 80 ? '#34D399' : '#FBBF24', unit: '%', sub: '≤5 bpm' },
        ].map(({ label, value, color, unit, sub }) => (
          <div key={label} className="rounded-xl p-3 border" style={{ background: '#141923', borderColor: '#1e2535' }}>
            <p className="text-xs mb-1" style={{ color: '#6b7990' }}>{label}</p>
            <p className="text-xl font-bold" style={{ color }}>
              {value != null ? `${value}${unit}` : '—'}
            </p>
            {sub && <p className="text-xs mt-0.5" style={{ color: '#6b7990' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border p-4" style={{ background: '#141923', borderColor: '#1e2535' }}>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="whoopGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="garminGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={(v) => format(new Date(v), 'h:mm')}
              tick={{ fill: '#6b7990', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1e2535' }}
              minTickGap={60}
            />
            <YAxis
              domain={[minBpm, maxBpm]}
              tick={{ fill: '#6b7990', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#6b7990' }}
              formatter={(value) => value === 'whoop' ? 'WHOOP' : 'Garmin'}
            />
            <Area
              type="monotone"
              dataKey="whoop"
              stroke="#FF3B5C"
              strokeWidth={2}
              fill="url(#whoopGrad)"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="garmin"
              stroke="#4FC3F7"
              strokeWidth={2}
              fill="url(#garminGrad)"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Brush
              dataKey="time"
              height={24}
              stroke="#1e2535"
              fill="#0d1117"
              travellerWidth={6}
              tickFormatter={(v) => format(new Date(v), 'h:mm')}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
