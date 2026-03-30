import type { DashboardData, HRComparisonData, SleepRecord, RecoveryRecord, Workout } from '../types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  // Auth
  whoopLoginUrl: () => `${BASE}/auth/whoop/login`,
  whoopStatus: () => get<{ connected: boolean }>('/auth/whoop/status'),
  whoopDisconnect: () => del('/auth/whoop/disconnect'),
  garminLogin: (email: string, password: string) =>
    post<{ connected: boolean }>('/auth/garmin/login', { email, password }),
  garminStatus: () => get<{ connected: boolean }>('/auth/garmin/status'),
  garminDisconnect: () => del('/auth/garmin/disconnect'),

  // Sync
  sync: (days = 7) => post<{ status: string }>(`/sync/?days=${days}`),

  // Data
  dashboard: () => get<DashboardData>('/data/dashboard'),
  hrComparison: (date: string) =>
    get<HRComparisonData>(`/data/heartrate/comparison?target_date=${date}`),
  hrComparisonRange: (start: string, end: string) =>
    get<{ series: Array<{ date: string; whoop: number | null; garmin: number | null }> }>(
      `/data/heartrate/comparison/range?start_date=${start}&end_date=${end}`
    ),
  sleep: (start?: string, end?: string) => {
    const params = new URLSearchParams()
    if (start) params.set('start_date', start)
    if (end) params.set('end_date', end)
    return get<{ whoop: SleepRecord[]; garmin: SleepRecord[] }>(`/data/sleep?${params}`)
  },
  recovery: (start?: string, end?: string) => {
    const params = new URLSearchParams()
    if (start) params.set('start_date', start)
    if (end) params.set('end_date', end)
    return get<{ whoop: RecoveryRecord[]; garmin: RecoveryRecord[] }>(`/data/recovery?${params}`)
  },
  workouts: (start?: string, end?: string) => {
    const params = new URLSearchParams()
    if (start) params.set('start_date', start)
    if (end) params.set('end_date', end)
    return get<{ workouts: Workout[] }>(`/data/workouts?${params}`)
  },
}
