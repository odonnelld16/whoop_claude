import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { SleepRecord } from '../../types'

interface Props {
  whoop: SleepRecord[]
  garmin: SleepRecord[]
}

const SleepTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border p-3 text-sm shadow-2xl" style={{ background: '#141923', borderColor: '#1e2535', minWidth: 180 }}>
      <p className="font-medium mb-2" style={{ color: '#6b7990' }}>
        {format(parseISO(label), 'MMM d')}
      </p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-medium" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}h</span>
          <span style={{ color: '#6b7990' }}>{p.name}</span>
        </div>
      ))}
    </div>
  )
}

export function SleepDurationChart({ whoop, garmin }: Props) {
  const allDates = Array.from(new Set([...whoop.map(r => r.date), ...garmin.map(r => r.date)])).sort()
  const whoopMap = new Map(whoop.map(r => [r.date, r]))
  const garminMap = new Map(garmin.map(r => [r.date, r]))

  const data = allDates.map(date => ({
    date,
    'WHOOP': whoopMap.get(date)?.total_hours ?? null,
    'Garmin': garminMap.get(date)?.total_hours ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
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
          tickFormatter={(v) => `${v}h`}
          width={36}
          domain={[0, 12]}
        />
        <Tooltip content={<SleepTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6b7990' }} />
        <Line type="monotone" dataKey="WHOOP" stroke="#FF3B5C" strokeWidth={2} dot={{ r: 3, fill: '#FF3B5C' }} connectNulls />
        <Line type="monotone" dataKey="Garmin" stroke="#4FC3F7" strokeWidth={2} dot={{ r: 3, fill: '#4FC3F7' }} connectNulls />
        {/* 8h reference */}
        <Line dataKey={() => 8} stroke="#34D399" strokeWidth={1} strokeDasharray="4 4" dot={false} name="8h goal" legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function SleepStagesChart({ data, device }: { data: SleepRecord[]; device: 'whoop' | 'garmin' }) {
  const color = device === 'whoop' ? '#FF3B5C' : '#4FC3F7'
  const recent = data.slice(-14)

  const chartData = recent.map(r => ({
    date: r.date,
    REM: r.rem_h ?? 0,
    Deep: r.sws_h ?? r.deep_h ?? 0,
    Light: r.light_h ?? 0,
    Awake: r.awake_h ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), 'M/d')}
          tick={{ fill: '#6b7990', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: '#1e2535' }}
        />
        <YAxis
          tick={{ fill: '#6b7990', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
          width={30}
        />
        <Tooltip content={<SleepTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#6b7990' }} />
        <Bar dataKey="REM" stackId="a" fill={color} fillOpacity={0.9} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Deep" stackId="a" fill={color} fillOpacity={0.65} />
        <Bar dataKey="Light" stackId="a" fill={color} fillOpacity={0.35} />
        <Bar dataKey="Awake" stackId="a" fill="#2a3448" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
