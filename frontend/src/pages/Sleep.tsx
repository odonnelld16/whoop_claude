import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { SleepDurationChart, SleepStagesChart } from '../components/charts/SleepChart'

export function Sleep() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 13), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['sleep', start, end],
    queryFn: () => api.sleep(start, end),
  })

  const latestWhoop = data?.whoop?.at(-1)
  const latestGarmin = data?.garmin?.at(-1)

  function avgOf(arr: (number | null | undefined)[]): number | null {
    const nums = arr.filter((v): v is number => v != null)
    if (!nums.length) return null
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
  }

  const whoopAvgHours = avgOf(data?.whoop?.map(r => r.total_hours) ?? [])
  const garminAvgHours = avgOf(data?.garmin?.map(r => r.total_hours) ?? [])

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Sleep</h1>
        <p style={{ color: '#6b7990' }}>Last 14 nights — both devices</p>
      </div>

      {/* Last night snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="WHOOP Sleep" value={latestWhoop?.total_hours} unit="h" device="whoop" sub={latestWhoop ? format(new Date(latestWhoop.date + 'T12:00'), 'MMM d') : undefined} />
        <MetricCard label="WHOOP Score" value={latestWhoop?.score != null ? Math.round(latestWhoop.score) : null} unit="%" device="whoop" />
        <MetricCard label="Garmin Sleep" value={latestGarmin?.total_hours} unit="h" device="garmin" sub={latestGarmin ? format(new Date(latestGarmin.date + 'T12:00'), 'MMM d') : undefined} />
        <MetricCard label="Garmin Score" value={latestGarmin?.score != null ? Math.round(latestGarmin.score) : null} unit="%" device="garmin" />
      </div>

      {/* Duration comparison */}
      {!isLoading && data && (
        <div className="rounded-xl border p-5 mb-4" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Sleep Duration — Both Devices</h3>
            <div className="flex gap-4 text-xs" style={{ color: '#6b7990' }}>
              {whoopAvgHours != null && <span style={{ color: '#FF3B5C' }}>WHOOP avg: <strong>{whoopAvgHours}h</strong></span>}
              {garminAvgHours != null && <span style={{ color: '#4FC3F7' }}>Garmin avg: <strong>{garminAvgHours}h</strong></span>}
            </div>
          </div>
          <SleepDurationChart whoop={data.whoop} garmin={data.garmin} />
        </div>
      )}

      {/* Stages */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ background: '#FF3B5C' }} />
              <h3 className="text-sm font-semibold">WHOOP Sleep Stages</h3>
            </div>
            <SleepStagesChart data={data.whoop} device="whoop" />
          </div>
          <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ background: '#4FC3F7' }} />
              <h3 className="text-sm font-semibold">Garmin Sleep Stages</h3>
            </div>
            <SleepStagesChart data={data.garmin} device="garmin" />
          </div>
        </div>
      )}
    </div>
  )
}
