import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { RecoveryRecord } from '../../types'

function scoreColor(v: number) {
  if (v >= 67) return '#34D399'
  if (v >= 34) return '#FBBF24'
  return '#F87171'
}

const RecoveryTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 text-sm shadow-2xl" style={{ background: '#141923', borderColor: '#1e2535', minWidth: 180 }}>
      <p className="font-medium mb-2" style={{ color: '#6b7990' }}>{format(parseISO(label), 'MMM d')}</p>
      {payload.map((p: any) => p.value != null && (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-medium" style={{ color: p.color }}>{typeof p.value === 'number' ? Math.round(p.value) : p.value}</span>
          <span style={{ color: '#6b7990' }}>{p.name}</span>
        </div>
      ))}
    </div>
  )
}

export function RecoveryScoreChart({ data }: { data: RecoveryRecord[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), 'M/d')}
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2535' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<RecoveryTooltip />} />
        <Bar dataKey="score" name="Recovery" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.score ? scoreColor(entry.score) : '#2a3448'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HRVChart({ whoopData, garminData }: { whoopData: RecoveryRecord[]; garminData: RecoveryRecord[] }) {
  const allDates = Array.from(new Set([...whoopData.map(r => r.date), ...garminData.map(r => r.date)])).sort()
  const whoopMap = new Map(whoopData.map(r => [r.date, r]))
  const garminMap = new Map(garminData.map(r => [r.date, r]))

  const data = allDates.map(date => ({
    date,
    'WHOOP HRV': whoopMap.get(date)?.hrv ?? null,
    'Garmin HRV': garminMap.get(date)?.hrv_last_night ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="whoopHRVGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="garminHRVGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), 'M/d')}
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2535' }}
        />
        <YAxis
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
          width={36}
        />
        <Tooltip content={<RecoveryTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6b7990' }} />
        <Area type="monotone" dataKey="WHOOP HRV" stroke="#FF3B5C" strokeWidth={2} fill="url(#whoopHRVGrad)" dot={false} connectNulls />
        <Area type="monotone" dataKey="Garmin HRV" stroke="#4FC3F7" strokeWidth={2} fill="url(#garminHRVGrad)" dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function BodyBatteryChart({ data }: { data: RecoveryRecord[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="bbHighGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), 'M/d')}
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2535' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#6b7990', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<RecoveryTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6b7990' }} />
        <Area type="monotone" dataKey="body_battery_high" name="Peak Battery" stroke="#4FC3F7" strokeWidth={2} fill="url(#bbHighGrad)" dot={false} connectNulls />
        <Line type="monotone" dataKey="body_battery_low" name="Low Battery" stroke="#4FC3F7" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
