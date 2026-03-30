import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
} from 'recharts'
import { parseISO } from 'date-fns'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'

function scoreColor(v: number | null | undefined) {
  if (v == null) return '#6b7990'
  if (v >= 67) return '#34D399'
  if (v >= 34) return '#FBBF24'
  return '#F87171'
}

function TrendChart({ data }: { data: Array<{ date: string; score: number | null }> }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => format(parseISO(v), 'M/d')} tick={{ fill: '#6b7990', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-lg border px-3 py-2 text-sm" style={{ background: '#141923', borderColor: '#1e2535' }}>
                <p style={{ color: '#6b7990' }}>{format(parseISO(label), 'MMM d')}</p>
                <p style={{ color: scoreColor(payload[0]?.value as number) }} className="font-semibold">{payload[0]?.value}%</p>
              </div>
            )
          }}
        />
        <Area type="monotone" dataKey="score" stroke="#FF3B5C" strokeWidth={2} fill="url(#recGrad)" dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
    refetchInterval: 60000,
  })

  const today = format(new Date(), 'EEEE, MMMM d')

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ background: '#141923' }} />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl" style={{ background: '#141923' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const w = data?.whoop
  const g = data?.garmin
  const trend = data?.recovery_trend ?? []

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p style={{ color: '#6b7990' }}>{today}</p>
      </div>

      {/* WHOOP section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF3B5C' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6b7990' }}>WHOOP</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Recovery"
            value={w?.recovery_score != null ? Math.round(w.recovery_score) : null}
            unit="%"
            device="whoop"
            color={scoreColor(w?.recovery_score)}
            large
          />
          <MetricCard label="HRV" value={w?.hrv_rmssd != null ? Math.round(w.hrv_rmssd) : null} unit="ms" device="whoop" />
          <MetricCard label="Resting HR" value={w?.resting_hr} unit="bpm" device="whoop" />
          <MetricCard label="SpO2" value={w?.spo2 != null ? w.spo2.toFixed(1) : null} unit="%" device="whoop" />
          <MetricCard label="Sleep Score" value={w?.sleep_score != null ? Math.round(w.sleep_score) : null} unit="%" device="whoop" />
          <MetricCard label="Sleep" value={w?.sleep_hours} unit="h" device="whoop" />
        </div>
      </div>

      {/* Garmin section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4FC3F7' }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6b7990' }}>GARMIN</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Body Battery" value={g?.body_battery_high} unit="%" device="garmin" large sub={g?.body_battery_low != null ? `Low: ${g.body_battery_low}%` : undefined} />
          <MetricCard label="HRV (nightly)" value={g?.hrv_last_night != null ? Math.round(g.hrv_last_night) : null} unit="ms" device="garmin" />
          <MetricCard label="HRV (7-day)" value={g?.hrv_weekly_avg != null ? Math.round(g.hrv_weekly_avg) : null} unit="ms" device="garmin" />
          <MetricCard label="Resting HR" value={g?.resting_hr} unit="bpm" device="garmin" />
          <MetricCard label="Avg Stress" value={g?.avg_stress != null ? Math.round(g.avg_stress) : null} device="garmin" color={g?.avg_stress != null ? (g.avg_stress < 25 ? '#34D399' : g.avg_stress < 50 ? '#FBBF24' : '#F87171') : undefined} />
          <MetricCard label="Steps" value={g?.steps != null ? g.steps.toLocaleString() : null} device="garmin" />
        </div>
      </div>

      {/* Cross-device comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-1">Resting HR Comparison</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7990' }}>Today</p>
          <div className="flex items-end gap-6">
            {w?.resting_hr && (
              <div>
                <p className="text-3xl font-bold" style={{ color: '#FF3B5C' }}>{w.resting_hr}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7990' }}>WHOOP bpm</p>
              </div>
            )}
            {g?.resting_hr && (
              <div>
                <p className="text-3xl font-bold" style={{ color: '#4FC3F7' }}>{g.resting_hr}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7990' }}>Garmin bpm</p>
              </div>
            )}
            {w?.resting_hr && g?.resting_hr && (
              <div className="ml-auto text-right">
                <p className="text-lg font-semibold" style={{ color: Math.abs(w.resting_hr - g.resting_hr) <= 3 ? '#34D399' : '#FBBF24' }}>
                  Δ {Math.abs(w.resting_hr - g.resting_hr)} bpm
                </p>
                <p className="text-xs" style={{ color: '#6b7990' }}>difference</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-1">Sleep Duration Comparison</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7990' }}>Last night</p>
          <div className="flex items-end gap-6">
            {w?.sleep_hours && (
              <div>
                <p className="text-3xl font-bold" style={{ color: '#FF3B5C' }}>{w.sleep_hours}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7990' }}>WHOOP hours</p>
              </div>
            )}
            {g?.sleep_hours && (
              <div>
                <p className="text-3xl font-bold" style={{ color: '#4FC3F7' }}>{g.sleep_hours}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7990' }}>Garmin hours</p>
              </div>
            )}
            {w?.sleep_hours && g?.sleep_hours && (
              <div className="ml-auto text-right">
                <p className="text-lg font-semibold" style={{ color: Math.abs(w.sleep_hours - g.sleep_hours) <= 0.5 ? '#34D399' : '#FBBF24' }}>
                  Δ {Math.abs(w.sleep_hours - g.sleep_hours).toFixed(1)}h
                </p>
                <p className="text-xs" style={{ color: '#6b7990' }}>difference</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery trend */}
      {trend.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-4">7-Day Recovery Trend (WHOOP)</h3>
          <TrendChart data={trend} />
        </div>
      )}
    </div>
  )
}
