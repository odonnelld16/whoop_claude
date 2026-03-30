export interface DashboardData {
  whoop: {
    recovery_score: number | null
    hrv_rmssd: number | null
    resting_hr: number | null
    spo2: number | null
    sleep_score: number | null
    sleep_hours: number | null
  }
  garmin: {
    body_battery_high: number | null
    body_battery_low: number | null
    resting_hr: number | null
    avg_stress: number | null
    steps: number | null
    sleep_score: number | null
    sleep_hours: number | null
    hrv_weekly_avg: number | null
    hrv_last_night: number | null
  }
  recovery_trend: Array<{ date: string; score: number | null; hrv: number | null; rhr: number | null }>
}

export interface HRPoint {
  ts: number
  bpm: number
}

export interface HRStats {
  whoop_avg?: number
  whoop_max?: number
  whoop_min?: number
  garmin_avg?: number
  garmin_max?: number
  garmin_min?: number
  avg_diff?: number
  agreement_pct?: number
  shared_minutes?: number
}

export interface HRComparisonData {
  date: string
  whoop: HRPoint[]
  garmin: HRPoint[]
  stats: HRStats
}

export interface SleepRecord {
  date: string
  total_hours: number | null
  score: number | null
  efficiency?: number | null
  light_h?: number | null
  sws_h?: number | null
  deep_h?: number | null
  rem_h?: number | null
  awake_h?: number | null
  disturbances?: number | null
  spo2?: number | null
}

export interface RecoveryRecord {
  date: string
  score?: number | null
  hrv?: number | null
  rhr?: number | null
  spo2?: number | null
  body_battery_high?: number | null
  body_battery_low?: number | null
  avg_stress?: number | null
  hrv_last_night?: number | null
  hrv_weekly_avg?: number | null
  hrv_status?: string | null
}

export interface Workout {
  date: string
  sport: string
  strain: number | null
  avg_hr: number | null
  max_hr: number | null
  calories: number | null
  zones: { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number }
}
