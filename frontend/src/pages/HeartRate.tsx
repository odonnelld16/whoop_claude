import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { parseISO } from 'date-fns'
import { api } from '../api'
import { HRComparisonChart } from '../components/charts/HRComparisonChart'

export function HeartRate() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['hr-comparison', selectedDate],
    queryFn: () => api.hrComparison(selectedDate),
  })

  const rangeEnd = format(new Date(), 'yyyy-MM-dd')
  const rangeStart = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const { data: rangeData } = useQuery({
    queryKey: ['hr-range', rangeStart, rangeEnd],
    queryFn: () => api.hrComparisonRange(rangeStart, rangeEnd),
  })

  const prevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const nextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    if (d <= new Date()) setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const RangeTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl border p-3 text-sm shadow-2xl" style={{ background: '#141923', borderColor: '#1e2535' }}>
        <p className="font-medium mb-1" style={{ color: '#6b7990' }}>{format(parseISO(label), 'MMM d')}</p>
        {payload.map((p: any) => p.value != null && (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="font-semibold" style={{ color: p.color }}>{Math.round(p.value)} bpm</span>
            <span style={{ color: '#6b7990' }}>{p.name}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Heart Rate</h1>
        <p style={{ color: '#6b7990' }}>Side-by-side comparison between your WHOOP and Garmin</p>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={prevDay}
          className="p-2 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: '#1e2535' }}
        >
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm font-medium outline-none"
          style={{ background: '#141923', borderColor: '#1e2535', color: 'white', colorScheme: 'dark' }}
        />
        <button
          onClick={nextDay}
          disabled={selectedDate >= format(new Date(), 'yyyy-MM-dd')}
          className="p-2 rounded-lg border transition-colors hover:bg-white/5 disabled:opacity-30"
          style={{ borderColor: '#1e2535' }}
        >
          <ChevronRight size={16} />
        </button>
        {isFetching && <span className="text-xs" style={{ color: '#6b7990' }}>Loading…</span>}
      </div>

      {/* Intraday comparison */}
      {isLoading ? (
        <div className="h-96 rounded-xl animate-pulse" style={{ background: '#141923' }} />
      ) : data ? (
        <HRComparisonChart whoop={data.whoop} garmin={data.garmin} stats={data.stats} />
      ) : null}

      {/* 30-day daily avg comparison */}
      {rangeData?.series && rangeData.series.length > 0 && (
        <div className="mt-8 rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-4">30-Day Daily Average HR Comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rangeData.series} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="w30Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g30Grad" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip content={<RangeTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6b7990' }} />
              <Line type="monotone" dataKey="whoop" name="WHOOP" stroke="#FF3B5C" strokeWidth={2} dot={{ r: 3, fill: '#FF3B5C' }} connectNulls />
              <Line type="monotone" dataKey="garmin" name="Garmin" stroke="#4FC3F7" strokeWidth={2} dot={{ r: 3, fill: '#4FC3F7' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
