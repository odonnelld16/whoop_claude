import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..models import WhoopToken, WhoopHeartRate, WhoopRecovery, WhoopSleep, WhoopWorkout
from ..config import get_settings

settings = get_settings()

WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"

SPORT_NAMES = {
    -1: "Activity", 0: "Running", 1: "Cycling", 16: "Baseball", 17: "Basketball",
    18: "Rowing", 33: "Swimming", 34: "Tennis", 44: "Yoga", 45: "Weightlifting",
    48: "Functional Fitness", 52: "Hiking", 56: "Martial Arts", 63: "Walking",
    65: "Elliptical", 66: "Stairmaster", 70: "Meditation", 71: "Other",
    100: "HIIT", 101: "Spin", 102: "Jiu Jitsu", 105: "Pickleball",
}


async def get_token(db: AsyncSession) -> Optional[WhoopToken]:
    result = await db.execute(select(WhoopToken).order_by(WhoopToken.updated_at.desc()))
    return result.scalars().first()


async def get_access_token(db: AsyncSession) -> Optional[str]:
    token = await get_token(db)
    if not token:
        return None

    now = datetime.now(timezone.utc)
    expires = token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires < now:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                WHOOP_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": token.refresh_token,
                    "client_id": settings.whoop_client_id,
                    "client_secret": settings.whoop_client_secret,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                token.access_token = data["access_token"]
                token.refresh_token = data.get("refresh_token", token.refresh_token)
                token.expires_at = now + timedelta(seconds=data["expires_in"])
                await db.commit()
                return token.access_token
        return None

    return token.access_token


async def api_get(db: AsyncSession, path: str, params: dict = None) -> dict:
    access_token = await get_access_token(db)
    if not access_token:
        raise ValueError("Not authenticated with WHOOP")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{WHOOP_API_BASE}{path}",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params or {},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()


async def sync_heart_rate(db: AsyncSession, start: str, end: str) -> int:
    next_token = None
    count = 0

    while True:
        params = {"start": start, "end": end, "order": "asc"}
        if next_token:
            params["next_token"] = next_token

        data = await api_get(db, "/heart_rate", params)
        records = data.get("records", [])

        for r in records:
            ts = int(datetime.fromisoformat(r["time"].replace("Z", "+00:00")).timestamp() * 1000)
            bpm = r["data"]["bpm"]
            existing = await db.execute(select(WhoopHeartRate).where(WhoopHeartRate.timestamp == ts))
            if not existing.scalars().first():
                db.add(WhoopHeartRate(timestamp=ts, bpm=bpm))
                count += 1

        next_token = data.get("next_token")
        if not next_token:
            break

    await db.commit()
    return count


async def sync_recovery(db: AsyncSession, start: str = None, end: str = None) -> int:
    params = {}
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    data = await api_get(db, "/recovery", params)
    records = data.get("records", [])

    for r in records:
        date = r.get("created_at", "")[:10]
        s = r.get("score", {})

        existing = await db.execute(select(WhoopRecovery).where(WhoopRecovery.date == date))
        existing = existing.scalars().first()

        vals = {
            "date": date,
            "score": s.get("recovery_score"),
            "hrv_rmssd": s.get("hrv_rmssd_milli"),
            "resting_hr": s.get("resting_heart_rate"),
            "spo2_percentage": s.get("spo2_percentage"),
            "skin_temp_celsius": s.get("skin_temp_celsius"),
            "cycle_id": r.get("cycle_id"),
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(WhoopRecovery(**vals))

    await db.commit()
    return len(records)


async def sync_sleep(db: AsyncSession, start: str = None, end: str = None) -> int:
    params = {}
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    data = await api_get(db, "/sleep", params)
    records = data.get("records", [])

    for r in records:
        sleep_id = r.get("id")
        s = r.get("score", {})
        stages = s.get("stage_summary", {})

        start_dt = datetime.fromisoformat(r["start"].replace("Z", "+00:00")) if r.get("start") else None
        end_dt = datetime.fromisoformat(r["end"].replace("Z", "+00:00")) if r.get("end") else None
        date = start_dt.strftime("%Y-%m-%d") if start_dt else ""

        existing = await db.execute(select(WhoopSleep).where(WhoopSleep.sleep_id == sleep_id))
        existing = existing.scalars().first()

        vals = {
            "sleep_id": sleep_id,
            "date": date,
            "start": start_dt,
            "end": end_dt,
            "total_sleep_sec": stages.get("total_in_bed_time_milli", 0) // 1000,
            "efficiency": s.get("sleep_efficiency_percentage"),
            "score": s.get("sleep_performance_percentage"),
            "light_sleep_sec": stages.get("light_sleep_duration_milli", 0) // 1000,
            "slow_wave_sleep_sec": stages.get("slow_wave_sleep_duration_milli", 0) // 1000,
            "rem_sleep_sec": stages.get("rem_sleep_duration_milli", 0) // 1000,
            "awake_sec": stages.get("awake_duration_milli", 0) // 1000,
            "disturbances": stages.get("disturbance_count"),
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(WhoopSleep(**vals))

    await db.commit()
    return len(records)


async def sync_workouts(db: AsyncSession, start: str = None, end: str = None) -> int:
    params = {}
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    data = await api_get(db, "/workout", params)
    records = data.get("records", [])

    for r in records:
        workout_id = r.get("id")
        s = r.get("score", {})
        zones = s.get("zone_duration", {})

        start_dt = datetime.fromisoformat(r["start"].replace("Z", "+00:00")) if r.get("start") else None
        end_dt = datetime.fromisoformat(r["end"].replace("Z", "+00:00")) if r.get("end") else None
        date = start_dt.strftime("%Y-%m-%d") if start_dt else ""
        sport_id = r.get("sport_id", -1)

        existing = await db.execute(select(WhoopWorkout).where(WhoopWorkout.workout_id == workout_id))
        existing = existing.scalars().first()

        vals = {
            "workout_id": workout_id,
            "date": date,
            "sport_id": sport_id,
            "sport_name": SPORT_NAMES.get(sport_id, f"Sport {sport_id}"),
            "start": start_dt,
            "end": end_dt,
            "strain": s.get("strain"),
            "avg_hr": s.get("average_heart_rate"),
            "max_hr": s.get("max_heart_rate"),
            "calories": (s.get("kilojoule") or 0) * 0.239006,
            "zone_zero_sec": zones.get("zone_zero_milli", 0) // 1000,
            "zone_one_sec": zones.get("zone_one_milli", 0) // 1000,
            "zone_two_sec": zones.get("zone_two_milli", 0) // 1000,
            "zone_three_sec": zones.get("zone_three_milli", 0) // 1000,
            "zone_four_sec": zones.get("zone_four_milli", 0) // 1000,
            "zone_five_sec": zones.get("zone_five_milli", 0) // 1000,
        }

        if existing:
            for k, v in vals.items():
                setattr(existing, k, v)
        else:
            db.add(WhoopWorkout(**vals))

    await db.commit()
    return len(records)
