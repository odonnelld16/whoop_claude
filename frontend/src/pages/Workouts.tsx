import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { parseISO } from 'date-fns'
import { api } from '../api'
import type { Workout } from '../types'

const ZONE_COLORS = ['#1e2535', '#4FC3F7', '#34D399', '#FBBF24', '#FB923C', '#F87171']
const ZONE_LABELS = ['Zone 0', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5']

function StrainBadge({ strain }: { strain: number | null }) {
  if (strain == null) return <span style={{ color: '#6b7990' }}>—</span>
  const color = strain >= 18 ? '#F87171' : strain >= 14 ? '#FB923C' : strain >= 10 ? '#FBBF24' : '#34D399'
  return <span className="font-bold text-lg" style={{ color }}>{strain.toFixed(1)}</span>
}

function ZoneBar({ zones }: { zones: Workout['zones'] }) {
  const vals = [zones.z0, zones.z1, zones.z2, zones.z3, zones.z4, zones.z5]
  const total = vals.reduce((a, b) => a + (b || 0), 0)
  if (!total) return null
  return (
    <div className="flex rounded overflow-hidden h-2 w-32">
      {vals.map((v, i) => (
        v > 0 ? (
          <div
            key={i}
            style={{ width: `${(v / total) * 100}%`, background: ZONE_COLORS[i] }}
            title={`${ZONE_LABELS[i]}: ${Math.round(v / 60)}m`}
          />
        ) : null
      ))}
    </div>
  )
}

export function Workouts() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['workouts', start, end],
    queryFn: () => api.workouts(start, end),
  })

  const workouts = data?.workouts ?? []

  const strainData = [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({ date: w.date, strain: w.strain, sport: w.sport }))

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <p style={{ color: '#6b7990' }}>Last 30 days — WHOOP data</p>
      </div>

      {/* Strain trend */}
      {strainData.length > 0 && (
        <div className="rounded-xl border p-5 mb-6" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-4">Strain per Workout</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={strainData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(parseISO(v), 'M/d')}
                tick={{ fill: '#6b7990', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#1e2535' }}
              />
              <YAxis
                domain={[0, 21]}
                tick={{ fill: '#6b7990', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="rounded-xl border p-3 text-sm" style={{ background: '#141923', borderColor: '#1e2535' }}>
                      <p style={{ color: '#6b7990' }}>{format(parseISO(label), 'MMM d')}</p>
                      <p className="font-semibold" style={{ color: '#FF3B5C' }}>{d?.strain?.toFixed(1)} strain</p>
                      <p style={{ color: '#6b7990' }}>{d?.sport}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="strain" radius={[3, 3, 0, 0]}>
                {strainData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      (d.strain ?? 0) >= 18 ? '#F87171' :
                      (d.strain ?? 0) >= 14 ? '#FB923C' :
                      (d.strain ?? 0) >= 10 ? '#FBBF24' : '#34D399'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workout list */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#141923', borderColor: '#1e2535' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2535' }}>
              {['Date', 'Sport', 'Strain', 'Avg HR', 'Max HR', 'Calories', 'Zones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7990' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e2535' }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse" style={{ background: '#1e2535', width: '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : workouts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#6b7990' }}>
                  No workouts found. Try syncing data.
                </td>
              </tr>
            ) : (
              workouts.map((w, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e2535' }}>
                  <td className="px-4 py-3" style={{ color: '#6b7990' }}>
                    {format(parseISO(w.date), 'MMM d')}
                  </td>
                  <td className="px-4 py-3 font-medium">{w.sport}</td>
                  <td className="px-4 py-3"><StrainBadge strain={w.strain} /></td>
                  <td className="px-4 py-3">{w.avg_hr ? `${w.avg_hr} bpm` : '—'}</td>
                  <td className="px-4 py-3">{w.max_hr ? `${w.max_hr} bpm` : '—'}</td>
                  <td className="px-4 py-3">{w.calories ? `${w.calories} kcal` : '—'}</td>
                  <td className="px-4 py-3"><ZoneBar zones={w.zones} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
