from sqlalchemy import Column, Integer, String, Float, DateTime, Text, BigInteger
from sqlalchemy.sql import func
from .database import Base


class WhoopToken(Base):
    __tablename__ = "whoop_tokens"
    id = Column(Integer, primary_key=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    token_type = Column(String(50), default="Bearer")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class WhoopHeartRate(Base):
    __tablename__ = "whoop_heart_rate"
    id = Column(Integer, primary_key=True)
    timestamp = Column(BigInteger, nullable=False, index=True, unique=True)
    bpm = Column(Integer, nullable=False)


class WhoopRecovery(Base):
    __tablename__ = "whoop_recovery"
    id = Column(Integer, primary_key=True)
    date = Column(String(10), nullable=False, unique=True, index=True)
    score = Column(Float)
    hrv_rmssd = Column(Float)
    resting_hr = Column(Integer)
    spo2_percentage = Column(Float)
    skin_temp_celsius = Column(Float)
    cycle_id = Column(Integer)


class WhoopSleep(Base):
    __tablename__ = "whoop_sleep"
    id = Column(Integer, primary_key=True)
    sleep_id = Column(Integer, unique=True)
    date = Column(String(10), index=True)
    start = Column(DateTime)
    end = Column(DateTime)
    total_sleep_sec = Column(Integer)
    efficiency = Column(Float)
    score = Column(Float)
    light_sleep_sec = Column(Integer)
    slow_wave_sleep_sec = Column(Integer)
    rem_sleep_sec = Column(Integer)
    awake_sec = Column(Integer)
    disturbances = Column(Integer)


class WhoopWorkout(Base):
    __tablename__ = "whoop_workouts"
    id = Column(Integer, primary_key=True)
    workout_id = Column(Integer, unique=True)
    date = Column(String(10), index=True)
    sport_id = Column(Integer)
    sport_name = Column(String(100))
    start = Column(DateTime)
    end = Column(DateTime)
    strain = Column(Float)
    avg_hr = Column(Integer)
    max_hr = Column(Integer)
    calories = Column(Float)
    zone_zero_sec = Column(Integer)
    zone_one_sec = Column(Integer)
    zone_two_sec = Column(Integer)
    zone_three_sec = Column(Integer)
    zone_four_sec = Column(Integer)
    zone_five_sec = Column(Integer)


class GarminHeartRate(Base):
    __tablename__ = "garmin_heart_rate"
    id = Column(Integer, primary_key=True)
    timestamp = Column(BigInteger, nullable=False, index=True, unique=True)
    bpm = Column(Integer, nullable=False)


class GarminDailyStats(Base):
    __tablename__ = "garmin_daily_stats"
    id = Column(Integer, primary_key=True)
    date = Column(String(10), nullable=False, unique=True, index=True)
    resting_hr = Column(Integer)
    max_hr = Column(Integer)
    min_hr = Column(Integer)
    avg_stress = Column(Float)
    max_stress = Column(Float)
    body_battery_highest = Column(Integer)
    body_battery_lowest = Column(Integer)
    steps = Column(Integer)
    total_calories = Column(Integer)
    active_calories = Column(Integer)


class GarminSleep(Base):
    __tablename__ = "garmin_sleep"
    id = Column(Integer, primary_key=True)
    date = Column(String(10), unique=True, index=True)
    start = Column(DateTime)
    end = Column(DateTime)
    total_sleep_sec = Column(Integer)
    deep_sleep_sec = Column(Integer)
    light_sleep_sec = Column(Integer)
    rem_sleep_sec = Column(Integer)
    awake_sec = Column(Integer)
    avg_spo2 = Column(Float)
    score = Column(Float)


class GarminHRV(Base):
    __tablename__ = "garmin_hrv"
    id = Column(Integer, primary_key=True)
    date = Column(String(10), unique=True, index=True)
    weekly_avg = Column(Float)
    last_night_avg = Column(Float)
    last_night_5min_high = Column(Float)
    baseline_low = Column(Float)
    baseline_high = Column(Float)
    status = Column(String(50))
