import os
import secrets
import httpx
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import WhoopToken
from ..services import garmin as garmin_svc
from ..config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_SCOPES = "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline"


@router.get("/whoop/login")
async def whoop_login():
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": settings.whoop_client_id,
        "redirect_uri": settings.whoop_redirect_uri,
        "response_type": "code",
        "scope": WHOOP_SCOPES,
        "state": state,
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{WHOOP_AUTH_URL}?{qs}")


@router.get("/whoop/callback")
async def whoop_callback(code: str, state: str = None, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.whoop_redirect_uri,
                "client_id": settings.whoop_client_id,
                "client_secret": settings.whoop_client_secret,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="WHOOP token exchange failed")
        token_data = resp.json()

    await db.execute(delete(WhoopToken))

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])
    db.add(WhoopToken(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        expires_at=expires_at,
        token_type=token_data.get("token_type", "Bearer"),
    ))
    await db.commit()

    return RedirectResponse(f"{settings.frontend_url}?whoop_connected=true")


@router.get("/whoop/status")
async def whoop_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WhoopToken))
    token = result.scalars().first()
    return {"connected": token is not None}


@router.delete("/whoop/disconnect")
async def whoop_disconnect(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(WhoopToken))
    await db.commit()
    return {"success": True}


class GarminLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/garmin/login")
async def garmin_login(body: GarminLoginRequest):
    success = await garmin_svc.login(body.email, body.password)
    if not success:
        raise HTTPException(status_code=401, detail="Invalid Garmin credentials")
    return {"connected": True}


@router.get("/garmin/status")
async def garmin_status():
    connected = await garmin_svc.is_connected()
    return {"connected": connected}


@router.delete("/garmin/disconnect")
async def garmin_disconnect():
    garmin_svc.disconnect()
    return {"success": True}
