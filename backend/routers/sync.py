from datetime import date, timedelta
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..services import whoop as whoop_svc
from ..services import garmin as garmin_svc

router = APIRouter(prefix="/api/sync", tags=["sync"])


async def _do_sync(start_date: str, end_date: str, db: AsyncSession):
    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    try:
        await whoop_svc.sync_heart_rate(db, start_iso, end_iso)
        await whoop_svc.sync_recovery(db, start_iso, end_iso)
        await whoop_svc.sync_sleep(db, start_iso, end_iso)
        await whoop_svc.sync_workouts(db, start_iso, end_iso)
    except Exception as e:
        print(f"WHOOP sync error: {e}")

    try:
        await garmin_svc.sync_date_range(db, start_date, end_date)
    except Exception as e:
        print(f"Garmin sync error: {e}")


@router.post("/")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
):
    end = date.today()
    start = end - timedelta(days=days - 1)
    background_tasks.add_task(_do_sync, start.isoformat(), end.isoformat(), db)
    return {"status": "syncing", "start": start.isoformat(), "end": end.isoformat()}


@router.post("/date-range")
async def sync_date_range(
    start_date: str,
    end_date: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    background_tasks.add_task(_do_sync, start_date, end_date, db)
    return {"status": "syncing", "start": start_date, "end": end_date}
