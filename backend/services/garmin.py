import os
import shutil
from datetime import datetime, date, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from garminconnect import Garmin
from ..models import GarminHeartRate, GarminDailyStats, GarminSleep, GarminHRV
from ..config import get_settings

settings = get_settings()
_client: Optional[Garmin] = None


def get_client() -> Optional[Garmin]:
    return _client


async def login(email: str, password: str) -> bool:
    global _client
    try:
        client = Garmin(email, password)
        client.login()
        os.makedirs(settings.garmin_tokens_dir, exist_ok=True)
        client.garth.dump(settings.garmin_tokens_dir)
        _client = client
        return True
    except Exception as e:
        print(f"Garmin login error: {e}")
        return False


async def resume_session() -> bool:
    global _client
    if not os.path.exists(settings.garmin_tokens_dir):
        return False
    try:
        client = Garmin()
        client.garth.load(settings.garmin_tokens_dir)
        client.display_name = client.garth.profile.get("displayName", "")
        _client = client
        return True
    except Exception:
        return False


async def is_connected() -> bool:
    if _client is None:
        return await resume_session()
    return True


def disconnect():
    global _client
    if os.path.exists(settings.garmin_tokens_dir):
        shutil.rmtree(settings.garmin_tokens_dir)
    _client = None


async def sync_heart_rate(db: AsyncSession, target_date: str) -> int:
    if not await is_connected():
        raise ValueError("Garmin not connected")
    try:
        data = _client.get_heart_rates(target_date)
        hr_values = data.get("heartRateValues", []) or []
        count = 0
        for item in hr_values:
            if not item or len(item) < 2 or item[1] is None:
                continue
            ts, bpm = item[0], item[1]
            existing = await db.execute(select(GarminHeartRate).where(GarminHeartRate.timestamp == ts))
            if not existing.scalars().first():
                db.add(GarminHeartRate(timestamp=ts, bpm=bpm))
                count += 1
        await db.commit()
        return count
    except Exception as e:
        print(f"Garmin HR sync error for {target_date}: {e}")
        return 0


async def sync_daily_stats(db: AsyncSession, target_date: str) -> bool:
    if not await is_connected():
        raise ValueError("Garmin not connected")
    try:
        stats = _client.get_stats(target_date)
        existing = await db.execute(select(GarminDailyStats).where(GarminDailyStats.date == target_date))
        existing = existing.scalars().first()

        vals = {
            "date": target_date,
            "resting_hr": stats.get("restingHeartRate"),
            "max_hr": stats.get("maxHeartRate"),
            "min_hr": stats.get("minHeartRate"),
            "avg_stress": stats.get("averageStressLevel"),
            "max_stress": stats.get("maxStressLevel"),
            "body_battery_highest": stats.get("bodyBatteryHighestValue"),
            "body_battery_lowest": stats.get("bodyBatteryLowestValue"),
            "steps": stats.get("totalSteps"),
            "total_calories": stats.get("totalKilocalories"),
            "active_calories": stats.get("activeKilocalories"),
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(GarminDailyStats(**vals))

        await db.commit()
        return True
    except Exception as e:
        print(f"Garmin stats sync error for {target_date}: {e}")
        return False


async def sync_sleep(db: AsyncSession, target_date: str) -> bool:
    if not await is_connected():
        raise ValueError("Garmin not connected")
    try:
        data = _client.get_sleep_data(target_date)
        daily = data.get("dailySleepDTO", {})
        if not daily:
            return False

        start_ts = daily.get("sleepStartTimestampGMT")
        end_ts = daily.get("sleepEndTimestampGMT")
        start_dt = datetime.fromtimestamp(start_ts / 1000) if start_ts else None
        end_dt = datetime.fromtimestamp(end_ts / 1000) if end_ts else None

        existing = await db.execute(select(GarminSleep).where(GarminSleep.date == target_date))
        existing = existing.scalars().first()

        sleep_scores = daily.get("sleepScores") or {}
        score_val = None
        if isinstance(sleep_scores, dict):
            overall = sleep_scores.get("overall") or {}
            score_val = overall.get("value") if isinstance(overall, dict) else None

        vals = {
            "date": target_date,
            "start": start_dt,
            "end": end_dt,
            "total_sleep_sec": daily.get("sleepTimeSeconds"),
            "deep_sleep_sec": daily.get("deepSleepSeconds"),
            "light_sleep_sec": daily.get("lightSleepSeconds"),
            "rem_sleep_sec": daily.get("remSleepSeconds"),
            "awake_sec": daily.get("awakeSleepSeconds"),
            "avg_spo2": daily.get("averageSpO2Value"),
            "score": score_val,
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(GarminSleep(**vals))

        await db.commit()
        return True
    except Exception as e:
        print(f"Garmin sleep sync error for {target_date}: {e}")
        return False


async def sync_hrv(db: AsyncSession, target_date: str) -> bool:
    if not await is_connected():
        raise ValueError("Garmin not connected")
    try:
        data = _client.get_hrv_data(target_date)
        summary = data.get("hrvSummary", {})
        if not summary:
            return False

        existing = await db.execute(select(GarminHRV).where(GarminHRV.date == target_date))
        existing = existing.scalars().first()

        vals = {
            "date": target_date,
            "weekly_avg": summary.get("weeklyAvg"),
            "last_night_avg": summary.get("lastNight"),
            "last_night_5min_high": summary.get("lastNight5MinHigh"),
            "baseline_low": summary.get("baselineLowUpper"),
            "baseline_high": summary.get("baselineBalancedUpper"),
            "status": summary.get("status"),
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(GarminHRV(**vals))

        await db.commit()
        return True
    except Exception as e:
        print(f"Garmin HRV sync error for {target_date}: {e}")
        return False


async def sync_date_range(db: AsyncSession, start_date: str, end_date: str) -> int:
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    current = start
    days = 0
    while current <= end:
        d = current.strftime("%Y-%m-%d")
        await sync_heart_rate(db, d)
        await sync_daily_stats(db, d)
        await sync_sleep(db, d)
        await sync_hrv(db, d)
        days += 1
        current += timedelta(days=1)
    return days
