from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import subprocess
import sys
import threading
import time
from datetime import date as date_cls, timedelta

app = FastAPI(title="Gym API")

def _health_sync_loop():
    time.sleep(30)  # let uvicorn finish starting
    while True:
        try:
            subprocess.run([sys.executable, "/app/health_sync.py"], check=True, timeout=900)
        except Exception as e:
            print(f"[health_sync] {e}")
        time.sleep(15 * 60)

threading.Thread(target=_health_sync_loop, daemon=True, name="health-sync").start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = {
    "host": os.getenv("DB_HOST", "172.21.0.1"),
    "dbname": os.getenv("DB_NAME", "fitness"),
    "user": os.getenv("DB_USER", "miendes"),
    "password": os.getenv("DB_PASSWORD", ""),
}

NUTRITION_DB = {
    "host": os.getenv("DB_HOST", "172.21.0.1"),
    "dbname": "nutrition_bot",
    "user": os.getenv("DB_USER", "miendes"),
    "password": os.getenv("DB_PASSWORD", ""),
}

HEALTH_DB = {
    "host": os.getenv("DB_HOST", "172.21.0.1"),
    "dbname": "health",
    "user": os.getenv("DB_USER", "miendes"),
    "password": os.getenv("DB_PASSWORD", ""),
}

def get_conn():
    return psycopg2.connect(**DB, cursor_factory=RealDictCursor)

def get_nutrition_conn():
    return psycopg2.connect(**NUTRITION_DB, cursor_factory=RealDictCursor)

def get_health_conn():
    return psycopg2.connect(**HEALTH_DB, cursor_factory=RealDictCursor)

# --- Models ---
class WorkoutTypeCreate(BaseModel):
    name: str

class ExerciseCreate(BaseModel):
    name: str
    workout_type_id: Optional[int] = None
    muscle_group: Optional[str] = None
    muscle_group_category_id: Optional[int] = None

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle_group: Optional[str] = None
    muscle_group_category_id: Optional[int] = None

class SetRecord(BaseModel):
    exercise_id: int
    set_number: int
    weight_kg: Optional[float]
    reps: int

class GinasioWorkoutCreate(BaseModel):
    workout_type_id: int
    duration_minutes: Optional[int]
    sets: List[SetRecord]
    date: Optional[str] = None

class CaminhadaWorkoutCreate(BaseModel):
    distance_km: Optional[float]
    duration_minutes: Optional[int]
    notes: Optional[str]
    date: Optional[str] = None

# --- Workout Types ---
@app.get("/workout-types")
def get_workout_types():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM workout_types ORDER BY name")
            return cur.fetchall()

@app.post("/workout-types")
def create_workout_type(data: WorkoutTypeCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO workout_types (name) VALUES (%s) RETURNING *", (data.name,))
            conn.commit()
            return cur.fetchone()

# --- Exercises ---
@app.get("/muscle-group-categories")
def get_muscle_group_categories():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM muscle_group_categories ORDER BY id")
            return cur.fetchall()

@app.get("/exercises")
def get_exercises(workout_type_id: Optional[int] = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            if workout_type_id:
                cur.execute("""
                    SELECT e.*, mgc.name as muscle_group_category_name
                    FROM exercises e
                    LEFT JOIN muscle_group_categories mgc ON e.muscle_group_category_id = mgc.id
                    JOIN exercise_workout_types ewt ON e.id = ewt.exercise_id
                    WHERE ewt.workout_type_id = %s
                    ORDER BY mgc.id NULLS LAST, e.name
                """, (workout_type_id,))
            else:
                cur.execute("""
                    SELECT e.*, mgc.name as muscle_group_category_name
                    FROM exercises e
                    LEFT JOIN muscle_group_categories mgc ON e.muscle_group_category_id = mgc.id
                    ORDER BY mgc.id NULLS LAST, e.name
                """)
            return cur.fetchall()

@app.post("/exercises")
def create_exercise(data: ExerciseCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO exercises (name, muscle_group, muscle_group_category_id) VALUES (%s, %s, %s) RETURNING *",
                (data.name, data.muscle_group, data.muscle_group_category_id)
            )
            exercise = cur.fetchone()
            if data.workout_type_id:
                cur.execute(
                    "INSERT INTO exercise_workout_types (exercise_id, workout_type_id) VALUES (%s, %s)",
                    (exercise['id'], data.workout_type_id)
                )
            conn.commit()
            return exercise

@app.patch("/exercises/{exercise_id}")
def update_exercise(exercise_id: int, data: ExerciseUpdate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            fields, values = [], []
            if data.name is not None:
                fields.append("name = %s")
                values.append(data.name)
            if 'muscle_group' in data.model_fields_set:
                fields.append("muscle_group = %s")
                values.append(data.muscle_group)
            if 'muscle_group_category_id' in data.model_fields_set:
                fields.append("muscle_group_category_id = %s")
                values.append(data.muscle_group_category_id)
            if not fields:
                cur.execute("SELECT * FROM exercises WHERE id = %s", (exercise_id,))
                return cur.fetchone()
            values.append(exercise_id)
            try:
                cur.execute(f"UPDATE exercises SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
                exercise = cur.fetchone()
                if not exercise:
                    raise HTTPException(status_code=404, detail="Exercise not found")
                conn.commit()
                return exercise
            except psycopg2.IntegrityError:
                conn.rollback()
                raise HTTPException(status_code=409, detail="An exercise with that name already exists")

@app.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("DELETE FROM exercises WHERE id = %s", (exercise_id,))
                conn.commit()
                return {"message": "Deleted"}
            except psycopg2.IntegrityError:
                conn.rollback()
                raise HTTPException(status_code=409, detail="This exercise is used in past workouts and cannot be deleted")

@app.delete("/exercise-workout-types/{exercise_id}/{workout_type_id}")
def unlink_exercise_from_type(exercise_id: int, workout_type_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM exercise_workout_types WHERE exercise_id = %s AND workout_type_id = %s",
                (exercise_id, workout_type_id)
            )
            conn.commit()
            return {"message": "Unlinked"}

@app.get("/exercises/{exercise_id}/suggested-weight")
def get_suggested_weight(exercise_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT weight_kg, COUNT(*) as cnt
                FROM workout_sets
                WHERE exercise_id = %s AND weight_kg IS NOT NULL
                GROUP BY weight_kg
                ORDER BY cnt DESC
                LIMIT 1
            """, (exercise_id,))
            row = cur.fetchone()
            return {"weight_kg": row['weight_kg'] if row else None}

# --- Workouts ---
@app.get("/workouts")
def get_workouts(type: Optional[str] = None, from_date: Optional[str] = None, to_date: Optional[str] = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT w.*, wt.name as workout_type_name
                FROM workouts w
                LEFT JOIN workout_types wt ON w.workout_type_id = wt.id
                WHERE 1=1
            """
            params = []
            if type:
                query += " AND w.type = %s"
                params.append(type)
            if from_date:
                query += " AND w.date >= %s"
                params.append(from_date)
            if to_date:
                query += " AND w.date <= %s"
                params.append(to_date)
            query += " ORDER BY w.date DESC"
            cur.execute(query, params)
            return cur.fetchall()

@app.get("/workouts/{workout_id}")
def get_workout(workout_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT w.*, wt.name as workout_type_name
                FROM workouts w
                LEFT JOIN workout_types wt ON w.workout_type_id = wt.id
                WHERE w.id = %s
            """, (workout_id,))
            workout = cur.fetchone()
            if not workout:
                raise HTTPException(status_code=404, detail="Workout not found")

            if workout['type'] == 'ginasio':
                cur.execute("""
                    SELECT ws.*, e.name as exercise_name,
                           MIN(ws.id) OVER (PARTITION BY ws.exercise_id) AS exercise_order
                    FROM workout_sets ws
                    JOIN exercises e ON ws.exercise_id = e.id
                    WHERE ws.workout_id = %s
                    ORDER BY exercise_order, ws.set_number
                """, (workout_id,))
                workout['sets'] = cur.fetchall()
            else:
                cur.execute("SELECT * FROM caminhada_details WHERE workout_id = %s", (workout_id,))
                workout['caminhada'] = cur.fetchone()

            return workout

@app.post("/workouts/ginasio")
def create_ginasio_workout(data: GinasioWorkoutCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO workouts (type, workout_type_id, duration_minutes, date)
                VALUES ('ginasio', %s, %s, %s) RETURNING *
            """, (data.workout_type_id, data.duration_minutes, data.date or 'NOW()'))
            workout = cur.fetchone()
            for s in data.sets:
                cur.execute("""
                    INSERT INTO workout_sets (workout_id, exercise_id, set_number, weight_kg, reps)
                    VALUES (%s, %s, %s, %s, %s)
                """, (workout['id'], s.exercise_id, s.set_number, s.weight_kg, s.reps))
            conn.commit()
            return workout

@app.post("/workouts/caminhada")
def create_caminhada_workout(data: CaminhadaWorkoutCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO workouts (type, duration_minutes, date)
                VALUES ('caminhada', %s, %s) RETURNING *
            """, (data.duration_minutes, data.date or 'NOW()'))
            workout = cur.fetchone()
            cur.execute("""
                INSERT INTO caminhada_details (workout_id, distance_km, notes)
                VALUES (%s, %s, %s)
            """, (workout['id'], data.distance_km, data.notes))
            conn.commit()
            return workout

@app.get("/analytics/summary")
def get_summary(months: int = 6):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN date >= DATE_TRUNC('week', NOW()) THEN 1 END)::int                                           AS this_week,
                    COUNT(CASE WHEN date >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
                                AND date <  DATE_TRUNC('week', NOW())  THEN 1 END)::int                                          AS last_week,
                    COUNT(CASE WHEN date >= DATE_TRUNC('month', NOW()) THEN 1 END)::int                                          AS this_month,
                    COUNT(CASE WHEN date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                                AND date <  DATE_TRUNC('month', NOW()) THEN 1 END)::int                                          AS last_month
                FROM workouts
            """)
            stats = cur.fetchone()
            cur.execute("""
                SELECT
                    TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
                    COUNT(*)::int AS count
                FROM workouts
                WHERE date >= DATE_TRUNC('month', NOW()) - (%s - 1) * INTERVAL '1 month'
                GROUP BY 1
                ORDER BY 1
            """, (months,))
            monthly = [{'month': r['month'], 'count': r['count']} for r in cur.fetchall()]
            return {
                'this_week': stats['this_week'], 'last_week': stats['last_week'],
                'this_month': stats['this_month'], 'last_month': stats['last_month'],
                'monthly': monthly,
            }

@app.get("/analytics/volume")
def get_volume(weeks: int = 8):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    DATE_TRUNC('week', w.date)::date AS week,
                    e.muscle_group,
                    SUM(ws.reps)::int AS volume
                FROM workouts w
                JOIN workout_sets ws ON ws.workout_id = w.id
                JOIN exercises e ON ws.exercise_id = e.id
                WHERE w.date >= NOW() - %s * INTERVAL '1 week'
                  AND e.muscle_group IS NOT NULL
                  AND e.muscle_group <> ''
                GROUP BY 1, 2
                ORDER BY 1, 2
            """, (weeks,))
            return [{'week': r['week'].isoformat(), 'muscle_group': r['muscle_group'], 'volume': r['volume']} for r in cur.fetchall()]

@app.get("/analytics/frequency")
def get_frequency(weeks: int = 8):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    w.date::date AS day,
                    w.type,
                    wt.name AS workout_type_name
                FROM workouts w
                LEFT JOIN workout_types wt ON w.workout_type_id = wt.id
                WHERE w.date >= NOW() - %s * INTERVAL '1 week'
                ORDER BY day
            """, (weeks,))
            return [{'day': r['day'].isoformat(), 'type': r['type'], 'workout_type_name': r['workout_type_name']} for r in cur.fetchall()]

@app.get("/analytics/progression")
def get_progression(exercise_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    w.date::date AS day,
                    MAX(ws.weight_kg) AS max_weight
                FROM workouts w
                JOIN workout_sets ws ON ws.workout_id = w.id
                WHERE ws.exercise_id = %s
                  AND ws.weight_kg IS NOT NULL
                GROUP BY w.date::date
                ORDER BY day
            """, (exercise_id,))
            return [{'day': r['day'].isoformat(), 'max_weight': float(r['max_weight'])} for r in cur.fetchall()]

@app.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM workouts WHERE id = %s", (workout_id,))
            conn.commit()
            return {"message": "Deleted"}

# --- Nutrition Knowledge Base ---
class FoodCreate(BaseModel):
    food_name: str
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    serving_description: Optional[str] = '1 porção'
    serving_g: Optional[float] = 100
    source: Optional[str] = 'manual'

class FoodUpdate(BaseModel):
    food_name: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    serving_description: Optional[str] = None
    serving_g: Optional[float] = None
    source: Optional[str] = None

def _food_row(r):
    return {
        'id': r['id'],
        'food_name': r['food_name'],
        'food_name_lower': r['food_name_lower'],
        'calories': float(r['calories']) if r['calories'] is not None else None,
        'protein_g': float(r['protein_g']) if r['protein_g'] is not None else None,
        'carbs_g': float(r['carbs_g']) if r['carbs_g'] is not None else None,
        'fat_g': float(r['fat_g']) if r['fat_g'] is not None else None,
        'serving_description': r['serving_description'],
        'serving_g': float(r['serving_g']) if r['serving_g'] is not None else None,
        'source': r['source'],
    }

@app.get("/nutrition/foods")
def get_foods():
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM knowledge_base ORDER BY food_name")
            return [_food_row(r) for r in cur.fetchall()]

@app.post("/nutrition/foods")
def create_food(data: FoodCreate):
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO knowledge_base
                    (food_name, food_name_lower, calories, protein_g, carbs_g, fat_g, serving_description, serving_g, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (data.food_name, data.food_name.lower(), data.calories, data.protein_g,
                  data.carbs_g, data.fat_g, data.serving_description, data.serving_g, data.source))
            row = cur.fetchone()
            conn.commit()
            return _food_row(row)

@app.patch("/nutrition/foods/{food_id}")
def update_food(food_id: int, data: FoodUpdate):
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            fields, values = [], []
            for col in ('food_name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'serving_description', 'serving_g', 'source'):
                val = getattr(data, col)
                if val is not None:
                    fields.append(f"{col} = %s")
                    values.append(val)
            if data.food_name is not None:
                fields.append("food_name_lower = %s")
                values.append(data.food_name.lower())
            if not fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            values.append(food_id)
            cur.execute(f"UPDATE knowledge_base SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Food not found")
            conn.commit()
            return _food_row(row)

# --- Nutrition Meals (daily log) ---
class MealUpdate(BaseModel):
    raw_message: Optional[str] = None
    total_calories: Optional[float] = None
    total_protein_g: Optional[float] = None
    total_carbs_g: Optional[float] = None
    total_fat_g: Optional[float] = None

def _meal_row(r):
    return {
        'id': r['id'],
        'raw_message': r['raw_message'],
        'total_calories': float(r['total_calories']) if r['total_calories'] is not None else None,
        'total_protein_g': float(r['total_protein_g']) if r['total_protein_g'] is not None else None,
        'total_carbs_g': float(r['total_carbs_g']) if r['total_carbs_g'] is not None else None,
        'total_fat_g': float(r['total_fat_g']) if r['total_fat_g'] is not None else None,
        'eaten_at': r['eaten_at'].isoformat() if r['eaten_at'] else None,
    }

@app.get("/nutrition/meals")
def get_meals(days: int = 7):
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM meals
                WHERE eaten_at::date >= CURRENT_DATE - (%s - 1)
                ORDER BY eaten_at DESC
            """, (days,))
            return [_meal_row(r) for r in cur.fetchall()]

@app.patch("/nutrition/meals/{meal_id}")
def update_meal(meal_id: int, data: MealUpdate):
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            fields, values = [], []
            for col in ('raw_message', 'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g'):
                val = getattr(data, col)
                if val is not None:
                    fields.append(f"{col} = %s")
                    values.append(val)
            if not fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            values.append(meal_id)
            cur.execute(f"UPDATE meals SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Meal not found")
            conn.commit()
            return _meal_row(row)

@app.delete("/nutrition/meals/{meal_id}")
def delete_meal(meal_id: int):
    with get_nutrition_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM meals WHERE id = %s", (meal_id,))
            conn.commit()
            return {"message": "Deleted"}

# --- Health (Fitbit) ---

def _f(val):
    return float(val) if val is not None else None

@app.get("/health/hr_during")
def get_hr_during(start: str, end: str):
    with get_health_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT sampled_at, bpm
                FROM fitbit.raw_heart_rate
                WHERE sampled_at >= %s AND sampled_at <= %s
                ORDER BY sampled_at ASC
            """, (start, end))
            points = [{'t': r['sampled_at'].isoformat(), 'bpm': r['bpm']} for r in cur.fetchall()]
            cur.execute("""
                SELECT zone_type, min_bpm, max_bpm
                FROM fitbit.computed_daily_hr_zones
                WHERE date = (
                    SELECT MAX(date) FROM fitbit.computed_daily_hr_zones
                    WHERE date <= %s::timestamptz::date
                )
                ORDER BY min_bpm
            """, (start,))
            zones = {r['zone_type']: {'min': r['min_bpm'], 'max': r['max_bpm']} for r in cur.fetchall()}
            return {'points': points, 'zones': zones}

@app.get("/health/current")
def get_health_current():
    with get_health_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT sampled_at, bpm FROM fitbit.raw_heart_rate ORDER BY sampled_at DESC LIMIT 1")
            hr = cur.fetchone()
            cur.execute("SELECT sampled_at, percentage FROM fitbit.raw_oxygen_saturation WHERE percentage > 50 ORDER BY sampled_at DESC LIMIT 1")
            spo2 = cur.fetchone()
            cur.execute("SELECT sampled_at, rmssd_ms FROM fitbit.raw_heart_rate_variability ORDER BY sampled_at DESC LIMIT 1")
            hrv = cur.fetchone()
            cur.execute("SELECT COALESCE(SUM(count),0)::int AS steps FROM fitbit.activity_steps WHERE interval_start::date = CURRENT_DATE")
            today_steps = cur.fetchone()['steps']
            cur.execute("SELECT COALESCE(SUM(meters),0) AS dist FROM fitbit.activity_distance WHERE interval_start::date = CURRENT_DATE")
            today_dist = _f(cur.fetchone()['dist'])
            return {
                'heart_rate': {'bpm': hr['bpm'], 'sampled_at': hr['sampled_at'].isoformat()} if hr else None,
                'spo2': {'percentage': _f(spo2['percentage']), 'sampled_at': spo2['sampled_at'].isoformat()} if spo2 else None,
                'hrv': {'rmssd_ms': _f(hrv['rmssd_ms']), 'sampled_at': hrv['sampled_at'].isoformat()} if hrv else None,
                'today_steps': today_steps,
                'today_distance_m': today_dist,
            }

@app.get("/health/days")
def get_health_days(days: int = 7, end_date: Optional[str] = None):
    with get_health_conn() as conn:
        with conn.cursor() as cur:
            end = date_cls.fromisoformat(end_date) if end_date else date_cls.today()
            start = end - timedelta(days=days - 1)
            date_list = [start + timedelta(days=i) for i in range(days)]

            cur.execute("SELECT date, bpm FROM fitbit.computed_daily_resting_heart_rate WHERE date >= %s", (start,))
            rhr = {r['date']: r['bpm'] for r in cur.fetchall()}

            cur.execute("SELECT date, avg_rmssd_ms, deep_sleep_rmssd_ms, entropy FROM fitbit.computed_daily_hrv WHERE date >= %s", (start,))
            hrv = {r['date']: r for r in cur.fetchall()}

            cur.execute("SELECT date, avg_pct, lower_pct FROM fitbit.computed_daily_oxygen_saturation WHERE date >= %s", (start,))
            spo2 = {r['date']: r for r in cur.fetchall()}

            cur.execute("SELECT date, breaths_per_min FROM fitbit.computed_daily_respiratory_rate WHERE date >= %s", (start,))
            resp = {r['date']: _f(r['breaths_per_min']) for r in cur.fetchall()}

            cur.execute("SELECT date, nightly_celsius, baseline_celsius FROM fitbit.computed_daily_sleep_temperature WHERE date >= %s", (start,))
            temp = {r['date']: r for r in cur.fetchall()}

            cur.execute("""
                SELECT interval_start::date AS d, SUM(count)::int AS steps
                FROM fitbit.activity_steps WHERE interval_start::date >= %s GROUP BY 1
            """, (start,))
            steps = {r['d']: r['steps'] for r in cur.fetchall()}

            cur.execute("""
                SELECT interval_start::date AS d, SUM(meters) AS dist
                FROM fitbit.activity_distance WHERE interval_start::date >= %s GROUP BY 1
            """, (start,))
            dist = {r['d']: _f(r['dist']) for r in cur.fetchall()}

            # Sleep: fetch sessions starting from the day before (catches early-AM sleeps)
            cur.execute("""
                SELECT s.id, s.started_at, s.ended_at, s.minutes_asleep, s.minutes_awake,
                       s.started_at::date AS sleep_date
                FROM fitbit.sessions_sleep s
                WHERE s.started_at::date >= %s - 1
                ORDER BY s.started_at DESC
            """, (start,))
            sleeps = {r['sleep_date']: r for r in cur.fetchall()}

            # Stage summaries for those sessions
            if sleeps:
                sleep_ids = [s['id'] for s in sleeps.values()]
                cur.execute("""
                    SELECT sleep_id, stage_type,
                           SUM(EXTRACT(EPOCH FROM (ended_at - started_at))/60)::int AS minutes
                    FROM fitbit.sessions_sleep_stages
                    WHERE sleep_id = ANY(%s)
                    GROUP BY sleep_id, stage_type
                """, (sleep_ids,))
                stage_rows = cur.fetchall()
                stages_by_sleep = {}
                for row in stage_rows:
                    stages_by_sleep.setdefault(row['sleep_id'], {})[row['stage_type']] = row['minutes']
            else:
                stages_by_sleep = {}

            result = []
            for d in reversed(date_list):  # newest first
                sl = sleeps.get(d)
                sleep_obj = None
                if sl:
                    sleep_obj = {
                        'started_at': sl['started_at'].isoformat(),
                        'ended_at': sl['ended_at'].isoformat(),
                        'minutes_asleep': sl['minutes_asleep'],
                        'minutes_awake': sl['minutes_awake'],
                        'stages': stages_by_sleep.get(sl['id'], {}),
                    }
                h = hrv.get(d, {})
                s = spo2.get(d, {})
                t = temp.get(d, {})
                result.append({
                    'date': d.isoformat(),
                    'resting_hr': rhr.get(d),
                    'hrv_avg_ms': _f(h.get('avg_rmssd_ms')),
                    'hrv_deep_rmssd_ms': _f(h.get('deep_sleep_rmssd_ms')),
                    'hrv_entropy': _f(h.get('entropy')),
                    'spo2_avg': _f(s.get('avg_pct')),
                    'spo2_lower': _f(s.get('lower_pct')),
                    'respiratory_rate': resp.get(d),
                    'sleep_temp_nightly': _f(t.get('nightly_celsius')),
                    'sleep_temp_baseline': _f(t.get('baseline_celsius')),
                    'steps': steps.get(d),
                    'distance_m': dist.get(d),
                    'sleep': sleep_obj,
                })
            return result

@app.get("/health/sleep/{date}")
def get_sleep_detail(date: str):
    with get_health_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM fitbit.sessions_sleep
                WHERE started_at::date = %s ORDER BY started_at DESC LIMIT 1
            """, (date,))
            sl = cur.fetchone()
            if not sl:
                raise HTTPException(status_code=404, detail="No sleep data for this date")
            cur.execute("""
                SELECT stage_type, started_at, ended_at
                FROM fitbit.sessions_sleep_stages WHERE sleep_id = %s ORDER BY started_at
            """, (sl['id'],))
            stages = cur.fetchall()
            return {
                'started_at': sl['started_at'].isoformat(),
                'ended_at': sl['ended_at'].isoformat(),
                'minutes_asleep': sl['minutes_asleep'],
                'minutes_awake': sl['minutes_awake'],
                'stages_timeline': [
                    {'type': s['stage_type'],
                     'started_at': s['started_at'].isoformat(),
                     'ended_at': s['ended_at'].isoformat()}
                    for s in stages
                ],
            }

@app.get("/health/exercise")
def get_health_exercise(days: int = 30):
    with get_health_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM fitbit.sessions_exercise
                WHERE started_at >= NOW() - %s * INTERVAL '1 day'
                ORDER BY started_at DESC
            """, (days,))
            return [{
                'started_at': r['started_at'].isoformat(),
                'ended_at': r['ended_at'].isoformat(),
                'exercise_type': r['exercise_type'],
                'display_name': r['display_name'],
                'active_duration_s': r['active_duration_s'],
                'calories_kcal': _f(r['calories_kcal']),
                'avg_hr_bpm': r['avg_hr_bpm'],
                'active_zone_minutes': r['active_zone_minutes'],
                'light_s': r['light_s'],
                'moderate_s': r['moderate_s'],
                'vigorous_s': r['vigorous_s'],
                'peak_s': r['peak_s'],
            } for r in cur.fetchall()]
