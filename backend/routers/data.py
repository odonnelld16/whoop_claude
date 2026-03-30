from datetime import date, timedelta
from typing import Optional
import statistics

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..database import get_db
from ..models import (
    WhoopHeartRate, WhoopRecovery, WhoopSleep, WhoopWorkout,
    GarminHeartRate, GarminDailyStats, GarminSleep, GarminHRV,
)

router = APIRouter(prefix="/api/data", tags=["data"])


def ts_to_ms(d: str, end: bool = False) -> int:
    from datetime import datetime, timezone
    dt = datetime.fromisoformat(f"{d}T{'23:59:59' if end else '00:00:00'}").replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=6)).isoformat()

    # Latest WHOOP recovery
    wr = await db.execute(
        select(WhoopRecovery).order_by(WhoopRecovery.date.desc()).limit(1)
    )
    latest_recovery = wr.scalars().first()

    # Latest Garmin stats
    gs = await db.execute(
        select(GarminDailyStats).order_by(GarminDailyStats.date.desc()).limit(1)
    )
    latest_garmin = gs.scalars().first()

    # Latest WHOOP sleep
    ws = await db.execute(
        select(WhoopSleep).order_by(WhoopSleep.date.desc()).limit(1)
    )
    latest_whoop_sleep = ws.scalars().first()

    # Latest Garmin sleep
    gsl = await db.execute(
        select(GarminSleep).order_by(GarminSleep.date.desc()).limit(1)
    )
    latest_garmin_sleep = gsl.scalars().first()

    # Latest Garmin HRV
    ghrv = await db.execute(
        select(GarminHRV).order_by(GarminHRV.date.desc()).limit(1)
    )
    latest_hrv = ghrv.scalars().first()

    # 7-day recovery trend
    recovery_trend = await db.execute(
        select(WhoopRecovery).where(WhoopRecovery.date >= week_ago).order_by(WhoopRecovery.date)
    )
    recovery_trend = [
        {"date": r.date, "score": r.score, "hrv": r.hrv_rmssd, "rhr": r.resting_hr}
        for r in recovery_trend.scalars().all()
    ]

    return {
        "whoop": {
            "recovery_score": latest_recovery.score if latest_recovery else None,
            "hrv_rmssd": latest_recovery.hrv_rmssd if latest_recovery else None,
            "resting_hr": latest_recovery.resting_hr if latest_recovery else None,
            "spo2": latest_recovery.spo2_percentage if latest_recovery else None,
            "sleep_score": latest_whoop_sleep.score if latest_whoop_sleep else None,
            "sleep_hours": round(latest_whoop_sleep.total_sleep_sec / 3600, 1) if latest_whoop_sleep and latest_whoop_sleep.total_sleep_sec else None,
        },
        "garmin": {
            "body_battery_high": latest_garmin.body_battery_highest if latest_garmin else None,
            "body_battery_low": latest_garmin.body_battery_lowest if latest_garmin else None,
            "resting_hr": latest_garmin.resting_hr if latest_garmin else None,
            "avg_stress": latest_garmin.avg_stress if latest_garmin else None,
            "steps": latest_garmin.steps if latest_garmin else None,
            "sleep_score": latest_garmin_sleep.score if latest_garmin_sleep else None,
            "sleep_hours": round(latest_garmin_sleep.total_sleep_sec / 3600, 1) if latest_garmin_sleep and latest_garmin_sleep.total_sleep_sec else None,
            "hrv_weekly_avg": latest_hrv.weekly_avg if latest_hrv else None,
            "hrv_last_night": latest_hrv.last_night_avg if latest_hrv else None,
        },
        "recovery_trend": recovery_trend,
    }


@router.get("/heartrate/comparison")
async def get_hr_comparison(
    target_date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not target_date:
        target_date = date.today().isoformat()

    start_ms = ts_to_ms(target_date, end=False)
    end_ms = ts_to_ms(target_date, end=True)

    whoop_result = await db.execute(
        select(WhoopHeartRate)
        .where(and_(WhoopHeartRate.timestamp >= start_ms, WhoopHeartRate.timestamp <= end_ms))
        .order_by(WhoopHeartRate.timestamp)
    )
    whoop_hr = [{"ts": r.timestamp, "bpm": r.bpm} for r in whoop_result.scalars().all()]

    garmin_result = await db.execute(
        select(GarminHeartRate)
        .where(and_(GarminHeartRate.timestamp >= start_ms, GarminHeartRate.timestamp <= end_ms))
        .order_by(GarminHeartRate.timestamp)
    )
    garmin_hr = [{"ts": r.timestamp, "bpm": r.bpm} for r in garmin_result.scalars().all()]

    # Compute stats
    w_bpms = [r["bpm"] for r in whoop_hr]
    g_bpms = [r["bpm"] for r in garmin_hr]

    stats = {}
    if w_bpms:
        stats["whoop_avg"] = round(statistics.mean(w_bpms))
        stats["whoop_max"] = max(w_bpms)
        stats["whoop_min"] = min(w_bpms)
    if g_bpms:
        stats["garmin_avg"] = round(statistics.mean(g_bpms))
        stats["garmin_max"] = max(g_bpms)
        stats["garmin_min"] = min(g_bpms)

    # Align by minute for diff calculation
    if w_bpms and g_bpms:
        # bucket both into 1-min bins
        def bucket(records):
            buckets = {}
            for r in records:
                minute = (r["ts"] // 60000) * 60000
                if minute not in buckets:
                    buckets[minute] = []
                buckets[minute].append(r["bpm"])
            return {k: round(statistics.mean(v)) for k, v in buckets.items()}

        w_bucketed = bucket(whoop_hr)
        g_bucketed = bucket(garmin_hr)
        shared = set(w_bucketed.keys()) & set(g_bucketed.keys())

        if shared:
            diffs = [abs(w_bucketed[k] - g_bucketed[k]) for k in shared]
            stats["avg_diff"] = round(statistics.mean(diffs), 1)
            stats["shared_minutes"] = len(shared)
            agree = sum(1 for d in diffs if d <= 5)
            stats["agreement_pct"] = round(agree / len(diffs) * 100)

    return {
        "date": target_date,
        "whoop": whoop_hr,
        "garmin": garmin_hr,
        "stats": stats,
    }


@router.get("/heartrate/comparison/range")
async def get_hr_comparison_range(
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Daily average HR comparison for a date range."""
    start_ms = ts_to_ms(start_date, end=False)
    end_ms = ts_to_ms(end_date, end=True)

    whoop_result = await db.execute(
        select(WhoopHeartRate)
        .where(and_(WhoopHeartRate.timestamp >= start_ms, WhoopHeartRate.timestamp <= end_ms))
        .order_by(WhoopHeartRate.timestamp)
    )
    garmin_result = await db.execute(
        select(GarminHeartRate)
        .where(and_(GarminHeartRate.timestamp >= start_ms, GarminHeartRate.timestamp <= end_ms))
        .order_by(GarminHeartRate.timestamp)
    )

    def bucket_by_day(records):
        days = {}
        for r in records:
            day = str(date.fromtimestamp(r.timestamp / 1000))
            if day not in days:
                days[day] = []
            days[day].append(r.bpm)
        return {d: round(statistics.mean(v)) for d, v in days.items()}

    whoop_by_day = bucket_by_day(whoop_result.scalars().all())
    garmin_by_day = bucket_by_day(garmin_result.scalars().all())

    all_dates = sorted(set(list(whoop_by_day.keys()) + list(garmin_by_day.keys())))
    series = [
        {
            "date": d,
            "whoop": whoop_by_day.get(d),
            "garmin": garmin_by_day.get(d),
        }
        for d in all_dates
    ]
    return {"series": series}


@router.get("/sleep")
async def get_sleep(
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not end_date:
        end_date = date.today().isoformat()
    if not start_date:
        start_date = (date.today() - timedelta(days=13)).isoformat()

    whoop_result = await db.execute(
        select(WhoopSleep)
        .where(and_(WhoopSleep.date >= start_date, WhoopSleep.date <= end_date))
        .order_by(WhoopSleep.date)
    )
    garmin_result = await db.execute(
        select(GarminSleep)
        .where(and_(GarminSleep.date >= start_date, GarminSleep.date <= end_date))
        .order_by(GarminSleep.date)
    )

    whoop_sleep = [
        {
            "date": r.date,
            "total_hours": round(r.total_sleep_sec / 3600, 2) if r.total_sleep_sec else None,
            "score": r.score,
            "efficiency": r.efficiency,
            "light_h": round(r.light_sleep_sec / 3600, 2) if r.light_sleep_sec else None,
            "sws_h": round(r.slow_wave_sleep_sec / 3600, 2) if r.slow_wave_sleep_sec else None,
            "rem_h": round(r.rem_sleep_sec / 3600, 2) if r.rem_sleep_sec else None,
            "awake_h": round(r.awake_sec / 3600, 2) if r.awake_sec else None,
            "disturbances": r.disturbances,
        }
        for r in whoop_result.scalars().all()
    ]

    garmin_sleep = [
        {
            "date": r.date,
            "total_hours": round(r.total_sleep_sec / 3600, 2) if r.total_sleep_sec else None,
            "score": r.score,
            "deep_h": round(r.deep_sleep_sec / 3600, 2) if r.deep_sleep_sec else None,
            "light_h": round(r.light_sleep_sec / 3600, 2) if r.light_sleep_sec else None,
            "rem_h": round(r.rem_sleep_sec / 3600, 2) if r.rem_sleep_sec else None,
            "awake_h": round(r.awake_sec / 3600, 2) if r.awake_sec else None,
            "spo2": r.avg_spo2,
        }
        for r in garmin_result.scalars().all()
    ]

    return {"whoop": whoop_sleep, "garmin": garmin_sleep}


@router.get("/recovery")
async def get_recovery(
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not end_date:
        end_date = date.today().isoformat()
    if not start_date:
        start_date = (date.today() - timedelta(days=29)).isoformat()

    whoop_result = await db.execute(
        select(WhoopRecovery)
        .where(and_(WhoopRecovery.date >= start_date, WhoopRecovery.date <= end_date))
        .order_by(WhoopRecovery.date)
    )
    garmin_result = await db.execute(
        select(GarminDailyStats)
        .where(and_(GarminDailyStats.date >= start_date, GarminDailyStats.date <= end_date))
        .order_by(GarminDailyStats.date)
    )
    hrv_result = await db.execute(
        select(GarminHRV)
        .where(and_(GarminHRV.date >= start_date, GarminHRV.date <= end_date))
        .order_by(GarminHRV.date)
    )

    hrv_by_date = {r.date: r for r in hrv_result.scalars().all()}

    whoop_recovery = [
        {
            "date": r.date,
            "score": r.score,
            "hrv": r.hrv_rmssd,
            "rhr": r.resting_hr,
            "spo2": r.spo2_percentage,
        }
        for r in whoop_result.scalars().all()
    ]

    garmin_daily = []
    for r in garmin_result.scalars().all():
        hrv = hrv_by_date.get(r.date)
        garmin_daily.append({
            "date": r.date,
            "body_battery_high": r.body_battery_highest,
            "body_battery_low": r.body_battery_lowest,
            "avg_stress": r.avg_stress,
            "rhr": r.resting_hr,
            "hrv_last_night": hrv.last_night_avg if hrv else None,
            "hrv_weekly_avg": hrv.weekly_avg if hrv else None,
            "hrv_status": hrv.status if hrv else None,
        })

    return {"whoop": whoop_recovery, "garmin": garmin_daily}


@router.get("/workouts")
async def get_workouts(
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not end_date:
        end_date = date.today().isoformat()
    if not start_date:
        start_date = (date.today() - timedelta(days=29)).isoformat()

    result = await db.execute(
        select(WhoopWorkout)
        .where(and_(WhoopWorkout.date >= start_date, WhoopWorkout.date <= end_date))
        .order_by(WhoopWorkout.date.desc())
    )

    workouts = [
        {
            "date": r.date,
            "sport": r.sport_name,
            "strain": r.strain,
            "avg_hr": r.avg_hr,
            "max_hr": r.max_hr,
            "calories": round(r.calories) if r.calories else None,
            "zones": {
                "z0": r.zone_zero_sec,
                "z1": r.zone_one_sec,
                "z2": r.zone_two_sec,
                "z3": r.zone_three_sec,
                "z4": r.zone_four_sec,
                "z5": r.zone_five_sec,
            },
        }
        for r in result.scalars().all()
    ]

    return {"workouts": workouts}
