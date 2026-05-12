import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Plus, X, ChevronLeft, Dumbbell, Footprints, Trash2, Clock, MapPin, ChevronDown, ChevronUp, Filter, Calendar } from 'lucide-react'

const API = '/api/gym'

const btn = (extra = {}) => ({
  border: 'none',
  borderRadius: '8px',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  ...extra
})

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '1.25rem',
}

const today = () => new Date().toISOString().split('T')[0]

export default function App() {
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('gym_active_view')
    return (saved === 'ginasio' || saved === 'caminhada') ? saved : 'list'
  })
  const [workouts, setWorkouts] = useState([])
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const loadWorkouts = async () => {
    const params = {}
    if (filterType) params.type = filterType
    if (filterFrom) params.from_date = filterFrom
    if (filterTo) params.to_date = filterTo
    const res = await axios.get(`${API}/workouts`, { params })
    setWorkouts(res.data)
  }

  useEffect(() => { setPage(1); loadWorkouts() }, [filterType, filterFrom, filterTo])

  useEffect(() => {
    if (view === 'ginasio' || view === 'caminhada') {
      localStorage.setItem('gym_active_view', view)
    } else {
      localStorage.removeItem('gym_active_view')
    }
  }, [view])

  const openWorkout = async (id) => {
    const res = await axios.get(`${API}/workouts/${id}`)
    setSelectedWorkout(res.data)
    setView('detail')
  }

  const deleteWorkout = async (id) => {
    await axios.delete(`${API}/workouts/${id}`)
    setView('list')
    loadWorkouts()
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 10
      }}>
        {view !== 'list' && (
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} color="var(--text-muted)" />
          </button>
        )}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginRight: 'auto' }}>
          edu<span style={{ color: 'var(--orange)', fontWeight: 500 }}>Gym</span>
        </span>
        {view === 'list' && (
          <button onClick={() => setView('choose')} style={btn({ background: 'var(--orange)', color: 'white' })}>
            <Plus size={16} /> New Workout
          </button>
        )}
      </header>

      <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={btn({ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', marginBottom: '0.5rem' })}
              >
                <Filter size={14} /> Filters {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showFilters && (
                <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Type</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                      <option value="">All</option>
                      <option value="ginasio">Ginásio</option>
                      <option value="caminhada">Caminhada</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>From</label>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>To</label>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {workouts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', paddingTop: '3rem' }}>
                No workouts yet. Hit the + button!
              </div>
            ) : (() => {
              const PER_PAGE = 10
              const totalPages = Math.ceil(workouts.length / PER_PAGE)
              const visible = workouts.slice((page - 1) * PER_PAGE, page * PER_PAGE)
              return (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {visible.map(w => (
                      <div
                        key={w.id}
                        onClick={() => openWorkout(w.id)}
                        style={{
                          ...card,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--surface-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
                      >
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: w.type === 'ginasio' ? 'var(--orange-dim2)' : 'rgba(74,140,106,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {w.type === 'ginasio'
                            ? <Dumbbell size={18} color="var(--orange)" />
                            : <Footprints size={18} color="var(--green-text)" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}>
                            {w.type === 'ginasio' ? (w.workout_type_name || 'Ginásio') : 'Caminhada'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {formatDate(w.date)}
                            {w.duration_minutes && ` · ${w.duration_minutes} min`}
                          </div>
                        </div>
                        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: 'rotate(-90deg)' }} />
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.25rem', marginTop: '1.25rem' }}>
                      <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                        style={btn({ background: 'var(--surface)', border: '1px solid var(--border)', color: page === 1 ? 'var(--border)' : 'var(--text-muted)', padding: '0.4rem 0.75rem' })}
                      >
                        ←
                      </button>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                        style={btn({ background: 'var(--surface)', border: '1px solid var(--border)', color: page === totalPages ? 'var(--border)' : 'var(--text-muted)', padding: '0.4rem 0.75rem' })}
                      >
                        →
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}

        {/* CHOOSE TYPE */}
        {view === 'choose' && (
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select workout type
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                onClick={() => setView('ginasio')}
                style={{ ...card, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'var(--text)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.background = 'var(--orange-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
              >
                <Dumbbell size={28} color="var(--orange)" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 500, color: 'var(--text)' }}>Ginásio</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Push · Pull · Legs</div>
              </button>
              <button
                onClick={() => setView('caminhada')}
                style={{ ...card, border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'var(--text)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-text)'; e.currentTarget.style.background = 'rgba(74,140,106,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
              >
                <Footprints size={28} color="var(--green-text)" style={{ marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 500, color: 'var(--text)' }}>Caminhada</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Distance · Time · Notes</div>
              </button>
            </div>
          </div>
        )}

        {view === 'ginasio' && <GinasioForm onSave={() => { loadWorkouts(); setView('list') }} onCancel={() => setView('list')} />}
        {view === 'caminhada' && <CaminhadaForm onSave={() => { loadWorkouts(); setView('list') }} onCancel={() => setView('list')} />}
        {view === 'detail' && selectedWorkout && (
          <WorkoutDetail workout={selectedWorkout} onDelete={() => deleteWorkout(selectedWorkout.id)} formatDate={formatDate} />
        )}
      </div>
    </div>
  )
}

const GINASIO_DRAFT = 'gym_ginasio_draft'
const CAMINHADA_DRAFT = 'gym_caminhada_draft'
const readDraft = (key) => { try { return JSON.parse(localStorage.getItem(key)) || null } catch { return null } }

function GinasioForm({ onSave, onCancel }) {
  const [workoutTypes, setWorkoutTypes] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedType, setSelectedType] = useState(() => readDraft(GINASIO_DRAFT)?.selectedType ?? '')
  const [duration, setDuration] = useState(() => readDraft(GINASIO_DRAFT)?.duration ?? '')
  const [date, setDate] = useState(() => readDraft(GINASIO_DRAFT)?.date ?? today())
  const [exerciseRows, setExerciseRows] = useState(() => readDraft(GINASIO_DRAFT)?.exerciseRows ?? [{ exercise_id: '', sets: [{ weight_kg: '', reps: '' }] }])
  const [newTypeName, setNewTypeName] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [saving, setSaving] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [watching, setWatching] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  const startWatch = () => {
    if (intervalRef.current) return
    startTimeRef.current = Date.now() - elapsed * 1000
    setWatching(true)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }

  const stopWatch = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setWatching(false)
    setDuration(String(Math.max(1, Math.round(elapsed / 60))))
  }

  const clearWatch = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  useEffect(() => () => clearWatch(), [])

  useEffect(() => {
    localStorage.setItem(GINASIO_DRAFT, JSON.stringify({ selectedType, duration, date, exerciseRows }))
  }, [selectedType, duration, date, exerciseRows])

  useEffect(() => {
    axios.get(`${API}/workout-types`).then(r => setWorkoutTypes(r.data))
  }, [])

  useEffect(() => {
    if (selectedType) {
      axios.get(`${API}/exercises`, { params: { workout_type_id: selectedType } }).then(r => setExercises(r.data))
    } else {
      setExercises([])
    }
  }, [selectedType])

  const addWorkoutType = async () => {
    if (!newTypeName.trim()) return
    const res = await axios.post(`${API}/workout-types`, { name: newTypeName.trim() })
    setWorkoutTypes(prev => [...prev, res.data])
    setNewTypeName('')
  }

  const addExercise = async () => {
    if (!newExerciseName.trim()) return
    const res = await axios.post(`${API}/exercises`, {
      name: newExerciseName.trim(),
      workout_type_id: selectedType ? parseInt(selectedType) : null
    })
    setExercises(prev => [...prev, res.data])
    setNewExerciseName('')
  }

  const addExerciseRow = () => setExerciseRows(prev => [...prev, { exercise_id: '', sets: [{ weight_kg: '', reps: '' }] }])
  const addSet = (rowIdx) => setExerciseRows(prev => prev.map((r, i) => {
    if (i !== rowIdx) return r
    const lastWeight = r.sets[r.sets.length - 1]?.weight_kg ?? ''
    return { ...r, sets: [...r.sets, { weight_kg: lastWeight, reps: '' }] }
  }))
  const removeSet = (rowIdx, setIdx) => setExerciseRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, sets: r.sets.filter((_, si) => si !== setIdx) } : r))
  const removeExerciseRow = (rowIdx) => setExerciseRows(prev => prev.filter((_, i) => i !== rowIdx))
  const updateSet = (rowIdx, setIdx, field, value) => setExerciseRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, sets: r.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) } : r))

  const handleSave = async () => {
    if (!selectedType) return alert('Select a workout type')
    setSaving(true)
    const sets = []
    for (const row of exerciseRows) {
      if (!row.exercise_id) continue
      row.sets.forEach((s, idx) => {
        if (s.reps) sets.push({
          exercise_id: parseInt(row.exercise_id),
          set_number: idx + 1,
          weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
          reps: parseInt(s.reps)
        })
      })
    }
    await axios.post(`${API}/workouts/ginasio`, {
      workout_type_id: parseInt(selectedType),
      duration_minutes: duration ? parseInt(duration) : null,
      sets,
      date
    })
    setSaving(false)
    clearWatch()
    localStorage.removeItem(GINASIO_DRAFT)
    onSave()
  }

  const handleCancel = () => {
    clearWatch()
    localStorage.removeItem(GINASIO_DRAFT)
    onCancel()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>WORKOUT DATE</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>WORKOUT TYPE</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {workoutTypes.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedType(t.id); setExerciseRows([{ exercise_id: '', sets: [{ weight_kg: '', reps: '' }] }]); startWatch() }}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1px solid',
                borderColor: selectedType == t.id ? 'var(--orange)' : 'var(--border)',
                background: selectedType == t.id ? 'var(--orange-dim2)' : 'transparent',
                color: selectedType == t.id ? 'var(--orange)' : 'var(--text-muted)',
                fontSize: '0.85rem'
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input placeholder="Add new type..." value={newTypeName} onChange={e => setNewTypeName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorkoutType()} />
          <button onClick={addWorkoutType} style={btn({ background: 'var(--orange)', color: 'white', flexShrink: 0 })}><Plus size={14} /></button>
        </div>
      </div>

      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>EXERCISES</label>
        {exerciseRows.map((row, rowIdx) => (
          <div key={rowIdx} style={{ borderLeft: '2px solid var(--orange)', paddingLeft: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select value={row.exercise_id} onChange={async e => {
                const exId = e.target.value
                setExerciseRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, exercise_id: exId } : r))
                if (exId) {
                  try {
                    const res = await axios.get(`${API}/exercises/${exId}/suggested-weight`)
                    if (res.data.weight_kg !== null) {
                      setExerciseRows(prev => prev.map((r, i) => i === rowIdx
                        ? { ...r, sets: r.sets.map(s => ({ ...s, weight_kg: String(res.data.weight_kg) })) }
                        : r
                      ))
                    }
                  } catch {}
                }
              }}>
                <option value="">Select exercise...</option>
                {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={() => removeExerciseRow(rowIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {row.sets.map((s, setIdx) => (
                <div key={setIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', width: '30px', flexShrink: 0 }}>S{setIdx + 1}</span>
                  <input type="number" placeholder="kg" value={s.weight_kg} onChange={e => updateSet(rowIdx, setIdx, 'weight_kg', e.target.value)} style={{ width: '70px' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>×</span>
                  <input type="number" placeholder="reps" value={s.reps} onChange={e => updateSet(rowIdx, setIdx, 'reps', e.target.value)} style={{ width: '70px' }} />
                  {row.sets.length > 1 && (
                    <button onClick={() => removeSet(rowIdx, setIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={13} color="var(--text-muted)" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => addSet(rowIdx)} style={btn({ background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--border)', marginTop: '0.5rem', fontSize: '0.75rem' })}>
              <Plus size={12} /> Add set
            </button>
          </div>
        ))}
        <button onClick={addExerciseRow} style={btn({ background: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid var(--orange)', marginBottom: '1rem' })}>
          <Plus size={14} /> Add exercise
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <input placeholder="Add new exercise to list..." value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExercise()} />
          <button onClick={addExercise} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', flexShrink: 0 })}><Plus size={14} /></button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>DURATION (minutes)</label>
          {!watching && (
            <button onClick={startWatch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}>
              ▶ start
            </button>
          )}
        </div>
        {watching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', color: 'var(--orange)', flex: 1, letterSpacing: '0.05em' }}>
              {formatElapsed(elapsed)}
            </span>
            <button onClick={stopWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.25rem 0.65rem' })}>
              Stop
            </button>
          </div>
        ) : (
          <input type="number" placeholder="e.g. 60" value={duration} onChange={e => setDuration(e.target.value)} />
        )}
      </div>

      <button onClick={handleSave} disabled={saving} style={btn({ background: 'var(--orange)', color: 'white', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
      <button onClick={handleCancel} style={btn({ background: '#080808', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        Cancel Workout
      </button>
    </div>
  )
}

function CaminhadaForm({ onSave, onCancel }) {
  const [distance, setDistance] = useState(() => readDraft(CAMINHADA_DRAFT)?.distance ?? '')
  const [duration, setDuration] = useState(() => readDraft(CAMINHADA_DRAFT)?.duration ?? '')
  const [notes, setNotes] = useState(() => readDraft(CAMINHADA_DRAFT)?.notes ?? '')
  const [date, setDate] = useState(() => readDraft(CAMINHADA_DRAFT)?.date ?? today())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    localStorage.setItem(CAMINHADA_DRAFT, JSON.stringify({ distance, duration, notes, date }))
  }, [distance, duration, notes, date])

  const handleSave = async () => {
    setSaving(true)
    await axios.post(`${API}/workouts/caminhada`, {
      distance_km: distance ? parseFloat(distance) : null,
      duration_minutes: duration ? parseInt(duration) : null,
      notes: notes || null,
      date
    })
    setSaving(false)
    localStorage.removeItem(CAMINHADA_DRAFT)
    onSave()
  }

  const handleCancel = () => {
    localStorage.removeItem(CAMINHADA_DRAFT)
    onCancel()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>WORKOUT DATE</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>DISTANCE (km)</label>
        <input type="number" step="0.1" placeholder="e.g. 5.5" value={distance} onChange={e => setDistance(e.target.value)} />
      </div>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>DURATION (minutes)</label>
        <input type="number" placeholder="e.g. 45" value={duration} onChange={e => setDuration(e.target.value)} />
      </div>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>NOTES</label>
        <textarea rows={3} placeholder="How did it go?" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
      </div>
      <button onClick={handleSave} disabled={saving} style={btn({ background: 'var(--green-text)', color: 'white', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
      <button onClick={handleCancel} style={btn({ background: '#080808', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        Cancel Workout
      </button>
    </div>
  )
}

function WorkoutDetail({ workout, onDelete, formatDate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const groupedSets = {}
  if (workout.sets) {
    for (const s of workout.sets) {
      if (!groupedSets[s.exercise_name]) groupedSets[s.exercise_name] = []
      groupedSets[s.exercise_name].push(s)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: workout.type === 'ginasio' ? 'var(--orange-dim2)' : 'rgba(74,140,106,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {workout.type === 'ginasio' ? <Dumbbell size={22} color="var(--orange)" /> : <Footprints size={22} color="var(--green-text)" />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
            {workout.type === 'ginasio' ? (workout.workout_type_name || 'Ginásio') : 'Caminhada'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{formatDate(workout.date)}</div>
        </div>
        {workout.duration_minutes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Clock size={14} />{workout.duration_minutes} min
          </div>
        )}
      </div>

      {workout.type === 'ginasio' && Object.entries(groupedSets).map(([name, sets]) => (
        <div key={name} style={card}>
          <div style={{ fontWeight: 500, marginBottom: '0.75rem', color: 'var(--orange)' }}>{name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sets.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.4rem 0.6rem', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', width: '30px' }}>S{s.set_number}</span>
                <span style={{ fontWeight: 500 }}>{s.weight_kg ? `${s.weight_kg} kg` : '—'}</span>
                <span style={{ color: 'var(--text-muted)' }}>×</span>
                <span style={{ fontWeight: 500 }}>{s.reps} reps</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {workout.type === 'caminhada' && workout.caminhada && (
        <div style={card}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workout.caminhada.distance_km && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--green-text)" />
                <span style={{ fontWeight: 500 }}>{workout.caminhada.distance_km} km</span>
              </div>
            )}
            {workout.caminhada.notes && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>{workout.caminhada.notes}</div>
            )}
          </div>
        </div>
      )}

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} style={btn({ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(224,85,85,0.2)', justifyContent: 'center' })}>
          <Trash2 size={14} /> Delete Workout
        </button>
      ) : (
        <div style={{ ...card, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Delete this workout?</span>
          <button onClick={() => setConfirmDelete(false)} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' })}>Cancel</button>
          <button onClick={onDelete} style={btn({ background: '#3a1a1a', color: 'var(--red)', border: '1px solid #5a2a2a' })}>Delete</button>
        </div>
      )}
    </div>
  )
}