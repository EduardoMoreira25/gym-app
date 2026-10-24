-- health database · fitbit schema
-- Run as: psql -U miendes -d health -f health_schema.sql

CREATE SCHEMA IF NOT EXISTS fitbit;

-- ── RAW SENSOR ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitbit.raw_heart_rate (
    id          BIGSERIAL PRIMARY KEY,
    sampled_at  TIMESTAMPTZ NOT NULL,
    bpm         SMALLINT    NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sampled_at)
);
CREATE INDEX IF NOT EXISTS raw_hr_sampled_at_idx ON fitbit.raw_heart_rate (sampled_at DESC);

CREATE TABLE IF NOT EXISTS fitbit.raw_oxygen_saturation (
    id          BIGSERIAL   PRIMARY KEY,
    sampled_at  TIMESTAMPTZ NOT NULL,
    percentage  NUMERIC(5,2) NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (sampled_at)
);
CREATE INDEX IF NOT EXISTS raw_spo2_sampled_at_idx ON fitbit.raw_oxygen_saturation (sampled_at DESC);

CREATE TABLE IF NOT EXISTS fitbit.raw_heart_rate_variability (
    id          BIGSERIAL    PRIMARY KEY,
    sampled_at  TIMESTAMPTZ  NOT NULL,
    rmssd_ms    NUMERIC(8,3) NOT NULL,
    inserted_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (sampled_at)
);
CREATE INDEX IF NOT EXISTS raw_hrv_sampled_at_idx ON fitbit.raw_heart_rate_variability (sampled_at DESC);

-- ── ACTIVITY STREAMS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitbit.activity_steps (
    id             BIGSERIAL   PRIMARY KEY,
    interval_start TIMESTAMPTZ NOT NULL,
    interval_end   TIMESTAMPTZ NOT NULL,
    count          INTEGER     NOT NULL,
    inserted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (interval_start)
);
CREATE INDEX IF NOT EXISTS act_steps_start_idx ON fitbit.activity_steps (interval_start DESC);

CREATE TABLE IF NOT EXISTS fitbit.activity_distance (
    id             BIGSERIAL    PRIMARY KEY,
    interval_start TIMESTAMPTZ  NOT NULL,
    interval_end   TIMESTAMPTZ  NOT NULL,
    meters         NUMERIC(8,3) NOT NULL,
    inserted_at    TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (interval_start)
);
CREATE INDEX IF NOT EXISTS act_dist_start_idx ON fitbit.activity_distance (interval_start DESC);

CREATE TABLE IF NOT EXISTS fitbit.activity_active_minutes (
    id             BIGSERIAL   PRIMARY KEY,
    interval_start TIMESTAMPTZ NOT NULL,
    interval_end   TIMESTAMPTZ NOT NULL,
    activity_level VARCHAR(20) NOT NULL, -- LIGHT · MODERATE · VIGOROUS · PEAK
    minutes        SMALLINT    NOT NULL,
    inserted_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (interval_start, activity_level)
);
CREATE INDEX IF NOT EXISTS act_active_start_idx ON fitbit.activity_active_minutes (interval_start DESC);

-- ── DAILY AGGREGATES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_resting_heart_rate (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE      NOT NULL UNIQUE,
    bpm         SMALLINT  NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_hrv (
    id                   BIGSERIAL    PRIMARY KEY,
    date                 DATE         NOT NULL UNIQUE,
    avg_rmssd_ms         NUMERIC(8,3),
    non_rem_bpm          SMALLINT,
    entropy              NUMERIC(6,3),
    deep_sleep_rmssd_ms  NUMERIC(8,3),
    inserted_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_oxygen_saturation (
    id          BIGSERIAL    PRIMARY KEY,
    date        DATE         NOT NULL UNIQUE,
    avg_pct     NUMERIC(5,2),
    lower_pct   NUMERIC(5,2),
    upper_pct   NUMERIC(5,2),
    stddev_pct  NUMERIC(5,3),
    inserted_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_hr_zones (
    id          BIGSERIAL   PRIMARY KEY,
    date        DATE        NOT NULL,
    zone_type   VARCHAR(20) NOT NULL, -- LIGHT · MODERATE · VIGOROUS · PEAK
    min_bpm     SMALLINT    NOT NULL,
    max_bpm     SMALLINT    NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (date, zone_type)
);

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_respiratory_rate (
    id                BIGSERIAL    PRIMARY KEY,
    date              DATE         NOT NULL UNIQUE,
    breaths_per_min   NUMERIC(5,2) NOT NULL,
    inserted_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitbit.computed_daily_sleep_temperature (
    id                  BIGSERIAL    PRIMARY KEY,
    date                DATE         NOT NULL UNIQUE,
    nightly_celsius     NUMERIC(7,4),
    baseline_celsius    NUMERIC(7,4),
    stddev_30d_celsius  NUMERIC(7,4),
    inserted_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- ── SESSIONS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fitbit.sessions_sleep (
    id               BIGSERIAL   PRIMARY KEY,
    api_id           TEXT        NOT NULL UNIQUE,
    started_at       TIMESTAMPTZ NOT NULL,
    ended_at         TIMESTAMPTZ NOT NULL,
    minutes_in_period INTEGER,
    minutes_asleep   INTEGER,
    minutes_awake    INTEGER,
    stages_status    VARCHAR(30),
    inserted_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sess_sleep_started_idx ON fitbit.sessions_sleep (started_at DESC);

CREATE TABLE IF NOT EXISTS fitbit.sessions_sleep_stages (
    id         BIGSERIAL   PRIMARY KEY,
    sleep_id   BIGINT      NOT NULL REFERENCES fitbit.sessions_sleep (id) ON DELETE CASCADE,
    stage_type VARCHAR(10) NOT NULL, -- AWAKE · LIGHT · DEEP · REM
    started_at TIMESTAMPTZ NOT NULL,
    ended_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sess_sleep_stages_sleep_id_idx ON fitbit.sessions_sleep_stages (sleep_id);

CREATE TABLE IF NOT EXISTS fitbit.sessions_exercise (
    id                  BIGSERIAL    PRIMARY KEY,
    api_id              TEXT         NOT NULL UNIQUE,
    started_at          TIMESTAMPTZ  NOT NULL,
    ended_at            TIMESTAMPTZ  NOT NULL,
    exercise_type       VARCHAR(50),
    display_name        VARCHAR(100),
    active_duration_s   INTEGER,
    calories_kcal       NUMERIC(7,2),
    avg_hr_bpm          SMALLINT,
    active_zone_minutes INTEGER,
    light_s             INTEGER,
    moderate_s          INTEGER,
    vigorous_s          INTEGER,
    peak_s              INTEGER,
    inserted_at         TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sess_exercise_started_idx ON fitbit.sessions_exercise (started_at DESC);

CREATE TABLE IF NOT EXISTS fitbit.sessions_respiratory_rate (
    id           BIGSERIAL    PRIMARY KEY,
    sampled_at   TIMESTAMPTZ  NOT NULL UNIQUE,
    deep_bpm     NUMERIC(5,2), deep_stddev  NUMERIC(5,2), deep_snr    NUMERIC(5,2),
    light_bpm    NUMERIC(5,2), light_stddev NUMERIC(5,2), light_snr   NUMERIC(5,2),
    rem_bpm      NUMERIC(5,2), rem_stddev   NUMERIC(5,2), rem_snr     NUMERIC(5,2),
    full_bpm     NUMERIC(5,2), full_stddev  NUMERIC(5,2), full_snr    NUMERIC(5,2),
    inserted_at  TIMESTAMPTZ  DEFAULT NOW()
);
