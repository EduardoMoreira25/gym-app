#!/usr/bin/env python3
"""
Fitbit → health DB sync
Pulls from Google Health API v4 and upserts into health.fitbit schema.
Designed to run as a cron job (e.g. every 15 min via systemd or crontab).
"""

import json
import os
import sys
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse, parse_qs

import psycopg2
import requests
from psycopg2.extras import execute_values

# ── Load .env ─────────────────────────────────────────────────────────────────
_ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_ENV_FILE):
    with open(_ENV_FILE) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

# ── Config ────────────────────────────────────────────────────────────────────
CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI  = "https://www.google.com"
TOKEN_FILE    = os.path.join(os.path.dirname(__file__), "health_token.json")

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "172.21.0.1"),
    "dbname":   "health",
    "user":     os.getenv("DB_USER",     "miendes"),
    "password": os.getenv("DB_PASSWORD", ""),
}

TOKEN_URL = "https://oauth2.googleapis.com/token"
BASE_URL  = "https://health.googleapis.com/v4"

# How far back to fetch on each sync run.
# Pass --full on first run to pull 90 days of history.
_FULL = "--full" in sys.argv
RAW_DAYS      = 90 if _FULL else 7    # raw sensor — API keeps ~7 days of samples
ACTIVITY_DAYS = 90 if _FULL else 3    # activity streams
DAILY_DAYS    = 90 if _FULL else 30   # daily aggregates (small, always generous)
SESSION_DAYS  = 90 if _FULL else 30   # sleep + exercise sessions

# ── DB ────────────────────────────────────────────────────────────────────────
@contextmanager
def get_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ── Auth ──────────────────────────────────────────────────────────────────────
def load_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            return json.load(f)
    return None

def save_token(token):
    with open(TOKEN_FILE, "w") as f:
        json.dump(token, f, indent=2)

def refresh_access_token(token):
    r = requests.post(TOKEN_URL, data={
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": token["refresh_token"],
        "grant_type":    "refresh_token",
    })
    r.raise_for_status()
    new = r.json()
    token["access_token"] = new["access_token"]
    if "refresh_token" in new:
        token["refresh_token"] = new["refresh_token"]
    save_token(token)
    return token

def get_access_token():
    token = load_token()
    if not token or "refresh_token" not in token:
        print("ERROR: no saved token. Run health_test_v4.py first to authenticate.")
        sys.exit(1)
    token = refresh_access_token(token)
    return token["access_token"]

# ── API helpers ───────────────────────────────────────────────────────────────
def ts(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def api_get_all(at, path, params=None, page_limit=200):
    """Fetch all pages from a list endpoint."""
    results = []
    p = dict(params or {})
    for _ in range(page_limit):
        r = requests.get(f"{BASE_URL}/{path}",
            headers={"Authorization": f"Bearer {at}"}, params=p, timeout=30)
        r.raise_for_status()
        data = r.json()
        for key in ("dataPoints", "dailyRollUps", "sessions"):
            if key in data:
                results.extend(data[key])
                break
        token = data.get("nextPageToken")
        if not token:
            break
        p["pageToken"] = token
    return results

def sample_filter(snake_type, days_back):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days_back)
    f = f"{snake_type}.sample_time.physical_time"
    return f'{f} >= "{ts(start)}" AND {f} < "{ts(now)}"'

def interval_filter(snake_type, days_back):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days_back)
    f = f"{snake_type}.interval.start_time"
    return f'{f} >= "{ts(start)}" AND {f} < "{ts(now)}"'

def parse_dur_s(val):
    """Parse '4922.400s' or '600s' → int seconds."""
    if val is None:
        return None
    return int(float(str(val).rstrip("s")))

# ── Sync functions ────────────────────────────────────────────────────────────

def sync_raw_heart_rate(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/heart-rate/dataPoints",
        {"filter": sample_filter("heart_rate", RAW_DAYS), "pageSize": 500})
    if not pts:
        return 0
    rows = []
    for p in pts:
        hr = p.get("heartRate", {})
        t = hr.get("sampleTime", {}).get("physicalTime")
        bpm = hr.get("beatsPerMinute")
        if t and bpm:
            rows.append((t, int(bpm)))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.raw_heart_rate (sampled_at, bpm) VALUES %s "
            "ON CONFLICT (sampled_at) DO NOTHING", rows)
    return len(rows)

def sync_raw_spo2(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/oxygen-saturation/dataPoints",
        {"filter": sample_filter("oxygen_saturation", RAW_DAYS), "pageSize": 1000})
    if not pts:
        return 0
    rows = []
    for p in pts:
        s = p.get("oxygenSaturation", {})
        t = s.get("sampleTime", {}).get("physicalTime")
        pct = s.get("percentage")
        if t and pct is not None and float(pct) > 0:
            rows.append((t, float(pct)))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.raw_oxygen_saturation (sampled_at, percentage) VALUES %s "
            "ON CONFLICT (sampled_at) DO NOTHING", rows)
    return len(rows)

def sync_raw_hrv(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/heart-rate-variability/dataPoints",
        {"filter": sample_filter("heart_rate_variability", RAW_DAYS), "pageSize": 1000})
    if not pts:
        return 0
    rows = []
    for p in pts:
        h = p.get("heartRateVariability", {})
        t = h.get("sampleTime", {}).get("physicalTime")
        rmssd = h.get("rootMeanSquareOfSuccessiveDifferencesMilliseconds")
        if t and rmssd is not None:
            rows.append((t, float(rmssd)))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.raw_heart_rate_variability (sampled_at, rmssd_ms) VALUES %s "
            "ON CONFLICT (sampled_at) DO NOTHING", rows)
    return len(rows)

def sync_activity_steps(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/steps/dataPoints",
        {"filter": interval_filter("steps", ACTIVITY_DAYS), "pageSize": 1000})
    if not pts:
        return 0
    rows = []
    for p in pts:
        s = p.get("steps", {})
        iv = s.get("interval", {})
        if iv.get("startTime") and s.get("count"):
            rows.append((iv["startTime"], iv["endTime"], int(s["count"])))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.activity_steps (interval_start, interval_end, count) VALUES %s "
            "ON CONFLICT (interval_start) DO NOTHING", rows)
    return len(rows)

def sync_activity_distance(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/distance/dataPoints",
        {"filter": interval_filter("distance", ACTIVITY_DAYS), "pageSize": 1000})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("distance", {})
        iv = d.get("interval", {})
        mm = d.get("millimeters")
        if iv.get("startTime") and mm:
            rows.append((iv["startTime"], iv["endTime"], float(mm) / 1000))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.activity_distance (interval_start, interval_end, meters) VALUES %s "
            "ON CONFLICT (interval_start) DO NOTHING", rows)
    return len(rows)

def sync_activity_active_minutes(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/active-minutes/dataPoints",
        {"filter": interval_filter("active_minutes", ACTIVITY_DAYS), "pageSize": 1000})
    if not pts:
        return 0
    rows = []
    for p in pts:
        am = p.get("activeMinutes", {})
        iv = am.get("interval", {})
        for lvl in am.get("activeMinutesByActivityLevel", []):
            rows.append((iv["startTime"], iv["endTime"],
                         lvl["activityLevel"], int(lvl["activeMinutes"])))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.activity_active_minutes "
            "(interval_start, interval_end, activity_level, minutes) VALUES %s "
            "ON CONFLICT (interval_start, activity_level) DO NOTHING", rows)
    return len(rows)

def sync_daily_resting_hr(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/daily-resting-heart-rate/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailyRestingHeartRate", {})
        date = d.get("date", {})
        bpm = d.get("beatsPerMinute")
        if date and bpm:
            rows.append((f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}', int(bpm)))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_resting_heart_rate (date, bpm) VALUES %s "
            "ON CONFLICT (date) DO UPDATE SET bpm = EXCLUDED.bpm", rows)
    return len(rows)

def sync_daily_hrv(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/daily-heart-rate-variability/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailyHeartRateVariability", {})
        date = d.get("date", {})
        if not date:
            continue
        rows.append((
            f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}',
            d.get("averageHeartRateVariabilityMilliseconds"),
            d.get("nonRemHeartRateBeatsPerMinute"),
            d.get("entropy"),
            d.get("deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds"),
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_hrv "
            "(date, avg_rmssd_ms, non_rem_bpm, entropy, deep_sleep_rmssd_ms) VALUES %s "
            "ON CONFLICT (date) DO UPDATE SET "
            "avg_rmssd_ms=EXCLUDED.avg_rmssd_ms, non_rem_bpm=EXCLUDED.non_rem_bpm, "
            "entropy=EXCLUDED.entropy, deep_sleep_rmssd_ms=EXCLUDED.deep_sleep_rmssd_ms", rows)
    return len(rows)

def sync_daily_spo2(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/daily-oxygen-saturation/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailyOxygenSaturation", {})
        date = d.get("date", {})
        if not date:
            continue
        rows.append((
            f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}',
            d.get("averagePercentage"),
            d.get("lowerBoundPercentage"),
            d.get("upperBoundPercentage"),
            d.get("standardDeviationPercentage"),
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_oxygen_saturation "
            "(date, avg_pct, lower_pct, upper_pct, stddev_pct) VALUES %s "
            "ON CONFLICT (date) DO UPDATE SET "
            "avg_pct=EXCLUDED.avg_pct, lower_pct=EXCLUDED.lower_pct, "
            "upper_pct=EXCLUDED.upper_pct, stddev_pct=EXCLUDED.stddev_pct", rows)
    return len(rows)

def sync_daily_hr_zones(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/daily-heart-rate-zones/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailyHeartRateZones", {})
        date = d.get("date", {})
        if not date:
            continue
        ds = f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}'
        for z in d.get("heartRateZones", []):
            rows.append((ds, z["heartRateZoneType"],
                         int(z["minBeatsPerMinute"]), int(z["maxBeatsPerMinute"])))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_hr_zones "
            "(date, zone_type, min_bpm, max_bpm) VALUES %s "
            "ON CONFLICT (date, zone_type) DO UPDATE SET "
            "min_bpm=EXCLUDED.min_bpm, max_bpm=EXCLUDED.max_bpm", rows)
    return len(rows)

def sync_daily_respiratory_rate(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/daily-respiratory-rate/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailyRespiratoryRate", {})
        date = d.get("date", {})
        bpm = d.get("breathsPerMinute")
        if date and bpm is not None:
            rows.append((f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}', float(bpm)))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_respiratory_rate (date, breaths_per_min) VALUES %s "
            "ON CONFLICT (date) DO UPDATE SET breaths_per_min=EXCLUDED.breaths_per_min", rows)
    return len(rows)

def sync_daily_sleep_temperature(at, conn):
    pts = api_get_all(at,
        "users/me/dataTypes/daily-sleep-temperature-derivations/dataPoints",
        {"pageSize": DAILY_DAYS})
    if not pts:
        return 0
    rows = []
    for p in pts:
        d = p.get("dailySleepTemperatureDerivations", {})
        date = d.get("date", {})
        if not date:
            continue
        rows.append((
            f'{date["year"]}-{date["month"]:02d}-{date["day"]:02d}',
            d.get("nightlyTemperatureCelsius"),
            d.get("baselineTemperatureCelsius"),
            d.get("relativeNightlyStddev30dCelsius"),
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.computed_daily_sleep_temperature "
            "(date, nightly_celsius, baseline_celsius, stddev_30d_celsius) VALUES %s "
            "ON CONFLICT (date) DO UPDATE SET "
            "nightly_celsius=EXCLUDED.nightly_celsius, "
            "baseline_celsius=EXCLUDED.baseline_celsius, "
            "stddev_30d_celsius=EXCLUDED.stddev_30d_celsius", rows)
    return len(rows)

def sync_sleep_sessions(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/sleep/dataPoints",
        {"pageSize": 100 if _FULL else 30})
    if not pts:
        return 0
    inserted = 0
    for p in pts:
        api_id = p.get("name", "")
        s = p.get("sleep", {})
        iv = s.get("interval", {})
        summary = s.get("summary", {})
        stages = s.get("stages", [])
        if not iv.get("startTime"):
            continue
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO fitbit.sessions_sleep "
                "(api_id, started_at, ended_at, minutes_in_period, minutes_asleep, "
                " minutes_awake, stages_status) VALUES (%s,%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (api_id) DO NOTHING RETURNING id",
                (api_id, iv["startTime"], iv["endTime"],
                 summary.get("minutesInSleepPeriod"),
                 summary.get("minutesAsleep"),
                 summary.get("minutesAwake"),
                 s.get("metadata", {}).get("stagesStatus")),
            )
            row = cur.fetchone()
            if row is None:
                continue  # already exists
            sleep_id = row[0]
            stage_rows = [
                (sleep_id, st["type"], st["startTime"], st["endTime"])
                for st in stages if st.get("startTime")
            ]
            if stage_rows:
                execute_values(cur,
                    "INSERT INTO fitbit.sessions_sleep_stages "
                    "(sleep_id, stage_type, started_at, ended_at) VALUES %s",
                    stage_rows)
        inserted += 1
    return inserted

def sync_exercise_sessions(at, conn):
    pts = api_get_all(at, "users/me/dataTypes/exercise/dataPoints",
        {"pageSize": 200 if _FULL else 50})
    if not pts:
        return 0
    rows = []
    for p in pts:
        api_id = p.get("name", "")
        ex = p.get("exercise", {})
        iv = ex.get("interval", {})
        ms = ex.get("metricsSummary", {})
        hzd = ms.get("heartRateZoneDurations", {})
        if not iv.get("startTime"):
            continue
        rows.append((
            api_id, iv["startTime"], iv["endTime"],
            ex.get("exerciseType"), ex.get("displayName"),
            parse_dur_s(ex.get("activeDuration")),
            ms.get("caloriesKcal"),
            ms.get("averageHeartRateBeatsPerMinute"),
            ms.get("activeZoneMinutes"),
            parse_dur_s(hzd.get("lightTime")),
            parse_dur_s(hzd.get("moderateTime")),
            parse_dur_s(hzd.get("vigorousTime")),
            parse_dur_s(hzd.get("peakTime")),
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.sessions_exercise "
            "(api_id, started_at, ended_at, exercise_type, display_name, "
            " active_duration_s, calories_kcal, avg_hr_bpm, active_zone_minutes, "
            " light_s, moderate_s, vigorous_s, peak_s) VALUES %s "
            "ON CONFLICT (api_id) DO NOTHING", rows)
    return len(rows)

def sync_respiratory_rate_sleep(at, conn):
    pts = api_get_all(at,
        "users/me/dataTypes/respiratory-rate-sleep-summary/dataPoints",
        {"pageSize": 50})
    if not pts:
        return 0
    rows = []
    for p in pts:
        rr = p.get("respiratoryRateSleepSummary", {})
        t = rr.get("sampleTime", {}).get("physicalTime")
        if not t:
            continue
        def s(stage, field):
            return rr.get(f"{stage}SleepStats", {}).get(field)
        rows.append((
            t,
            s("deep","breathsPerMinute"), s("deep","standardDeviation"), s("deep","signalToNoise"),
            s("light","breathsPerMinute"), s("light","standardDeviation"), s("light","signalToNoise"),
            s("rem","breathsPerMinute"), s("rem","standardDeviation"), s("rem","signalToNoise"),
            s("full","breathsPerMinute"), s("full","standardDeviation"), s("full","signalToNoise"),
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            "INSERT INTO fitbit.sessions_respiratory_rate "
            "(sampled_at, deep_bpm, deep_stddev, deep_snr, "
            " light_bpm, light_stddev, light_snr, "
            " rem_bpm, rem_stddev, rem_snr, "
            " full_bpm, full_stddev, full_snr) VALUES %s "
            "ON CONFLICT (sampled_at) DO NOTHING", rows)
    return len(rows)

# ── Main ──────────────────────────────────────────────────────────────────────
SYNCS = [
    ("raw heart rate",              sync_raw_heart_rate),
    ("raw SpO2",                    sync_raw_spo2),
    ("raw HRV",                     sync_raw_hrv),
    ("activity steps",              sync_activity_steps),
    ("activity distance",           sync_activity_distance),
    ("activity active minutes",     sync_activity_active_minutes),
    ("daily resting HR",            sync_daily_resting_hr),
    ("daily HRV",                   sync_daily_hrv),
    ("daily SpO2",                  sync_daily_spo2),
    ("daily HR zones",              sync_daily_hr_zones),
    ("daily respiratory rate",      sync_daily_respiratory_rate),
    ("daily sleep temperature",     sync_daily_sleep_temperature),
    ("sleep sessions",              sync_sleep_sessions),
    ("exercise sessions",           sync_exercise_sessions),
    ("respiratory rate (sleep)",    sync_respiratory_rate_sleep),
]

SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
]

def do_auth():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("ERROR: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.")
        sys.exit(1)
    from urllib.parse import urlencode
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    print("\n── Google Health Re-Auth ──────────────────────────────────")
    print("1. Open this URL in your browser:\n")
    print(f"   {url}\n")
    print("2. Sign in and grant access.")
    print("3. You'll be redirected to google.com — copy the 'code' value from the URL bar.")
    print("   It looks like: ?code=4/0Ab...&scope=...")
    print()
    code = input("Paste the code here: ").strip()
    r = requests.post(TOKEN_URL, data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }, timeout=15)
    r.raise_for_status()
    token = r.json()
    save_token(token)
    print(f"\n✓ Token saved to {TOKEN_FILE}")
    expires = token.get("refresh_token_expires_in", "?")
    print(f"  Refresh token valid for: {int(expires)//86400} days" if isinstance(expires, int) else "")

def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("ERROR: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.")
        sys.exit(1)

    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Starting Fitbit sync...")
    at = get_access_token()

    with get_conn() as conn:
        for label, fn in SYNCS:
            try:
                n = fn(at, conn)
                print(f"  ✓ {label}: {n} rows")
            except Exception as e:
                print(f"  ✗ {label}: {e}")

    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Done.")

if __name__ == "__main__":
    if "--auth" in sys.argv:
        do_auth()
    else:
        main()
