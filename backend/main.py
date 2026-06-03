from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import os

app = FastAPI(title="Gym API")

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

def get_conn():
    return psycopg2.connect(**DB, cursor_factory=RealDictCursor)

# --- Models ---
class WorkoutTypeCreate(BaseModel):
    name: str

class ExerciseCreate(BaseModel):
    name: str
    workout_type_id: Optional[int] = None
    muscle_group: Optional[str] = None

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle_group: Optional[str] = None

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
@app.get("/exercises")
def get_exercises(workout_type_id: Optional[int] = None):
    with get_conn() as conn:
        with conn.cursor() as cur:
            if workout_type_id:
                cur.execute("""
                    SELECT e.* FROM exercises e
                    JOIN exercise_workout_types ewt ON e.id = ewt.exercise_id
                    WHERE ewt.workout_type_id = %s
                    ORDER BY e.name
                """, (workout_type_id,))
            else:
                cur.execute("SELECT * FROM exercises ORDER BY name")
            return cur.fetchall()

@app.post("/exercises")
def create_exercise(data: ExerciseCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO exercises (name, muscle_group) VALUES (%s, %s) RETURNING *",
                (data.name, data.muscle_group)
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
