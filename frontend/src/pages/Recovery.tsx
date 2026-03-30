import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { api } from '../api'
import { MetricCard } from '../components/MetricCard'
import { RecoveryScoreChart, HRVChart, BodyBatteryChart } from '../components/charts/RecoveryChart'

const HRV_STATUS_COLOR: Record<string, string> = {
  BALANCED: '#34D399',
  UNBALANCED: '#FBBF24',
  LOW: '#F87171',
  POOR: '#F87171',
}

export function Recovery() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['recovery', start, end],
    queryFn: () => api.recovery(start, end),
  })

  const latestWhoop = data?.whoop?.at(-1)
  const latestGarmin = data?.garmin?.at(-1)

  function scoreColor(v: number | null | undefined) {
    if (v == null) return undefined
    if (v >= 67) return '#34D399'
    if (v >= 34) return '#FBBF24'
    return '#F87171'
  }

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Recovery</h1>
        <p style={{ color: '#6b7990' }}>Last 30 days</p>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="WHOOP Recovery"
          value={latestWhoop?.score != null ? Math.round(latestWhoop.score) : null}
          unit="%"
          device="whoop"
          color={scoreColor(latestWhoop?.score)}
          large
        />
        <MetricCard
          label="WHOOP HRV"
          value={latestWhoop?.hrv != null ? Math.round(latestWhoop.hrv) : null}
          unit="ms"
          device="whoop"
        />
        <MetricCard
          label="Body Battery Peak"
          value={latestGarmin?.body_battery_high}
          unit="%"
          device="garmin"
          large
        />
        <MetricCard
          label="Garmin HRV"
          value={latestGarmin?.hrv_last_night != null ? Math.round(latestGarmin.hrv_last_night) : null}
          unit="ms"
          device="garmin"
          sub={latestGarmin?.hrv_status ?? undefined}
          color={latestGarmin?.hrv_status ? HRV_STATUS_COLOR[latestGarmin.hrv_status] : undefined}
        />
      </div>

      {/* Recovery score chart */}
      {!isLoading && data?.whoop && data.whoop.length > 0 && (
        <div className="rounded-xl border p-5 mb-4" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full" style={{ background: '#FF3B5C' }} />
            <h3 className="text-sm font-semibold">WHOOP Recovery Score</h3>
          </div>
          <RecoveryScoreChart data={data.whoop} />
        </div>
      )}

      {/* HRV comparison */}
      {!isLoading && data && (
        <div className="rounded-xl border p-5 mb-4" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <h3 className="text-sm font-semibold mb-1">HRV — WHOOP vs Garmin</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7990' }}>
            WHOOP: nightly rmssd · Garmin: last night avg
          </p>
          <HRVChart whoopData={data.whoop} garminData={data.garmin} />
        </div>
      )}

      {/* Body battery */}
      {!isLoading && data?.garmin && data.garmin.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full" style={{ background: '#4FC3F7' }} />
            <h3 className="text-sm font-semibold">Garmin Body Battery</h3>
          </div>
          <BodyBatteryChart data={data.garmin} />
        </div>
      )}
    </div>
  )
}
