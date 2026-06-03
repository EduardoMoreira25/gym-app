import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, X, ChevronLeft, Dumbbell, Footprints, Trash2, Clock, MapPin, ChevronDown, ChevronUp, Filter, Calendar, Menu, Check } from 'lucide-react'

const MUSCLE_GROUPS = [
  'Chest (pectoralis major – mid/overall)',
  'Upper Chest (clavicular head)',
  'Lower Chest (sternal head)',
  'Front Delts (anterior deltoid)',
  'Side Delts (lateral deltoid)',
  'Rear Delts (posterior deltoid)',
  'Upper Back (traps, rhomboids)',
  'Lats (latissimus dorsi – width)',
  'Mid Back (rhomboids, mid-traps)',
  'Lower Back (erector spinae)',
  'Biceps (biceps brachii)',
  'Brachialis (under the bicep)',
  'Triceps (all 3 heads: long, lateral, medial)',
  'Forearms (flexors & extensors)',
  'Quads (quadriceps – front of thigh)',
  'Hamstrings (back of thigh)',
  'Glutes (gluteus maximus, medius, minimus)',
  'Hip Abductors (outer thigh)',
  'Hip Adductors (inner thigh)',
  'Calves (gastrocnemius & soleus)',
  'Abs (rectus abdominis – the "six pack")',
  'Obliques (side abs)',
  'Transverse Abdominis (deep core)',
  'Serratus Anterior (side of ribcage)',
  'Traps (upper, mid, lower trapezius)',
  'Neck (sternocleidomastoid, etc.)',
]

const API = '/api/gym'

const CHART_COLORS = [
  '#e07b54', '#4a9e7a', '#6a8fd4', '#d4b45a', '#b46ad4',
  '#4ad4c4', '#d4706a', '#7ad46a', '#d48c6a', '#6a7ad4',
  '#d4a44a', '#4ab4d4', '#d46a9a', '#8ad46a', '#6ad4a4',
]

const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtShortDate = (str) => {
  if (!str) return ''
  const [y, m, day] = str.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleString('en', { month: 'short', day: 'numeric' })
}

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

const today = () => localNow().split('T')[0]
const localNow = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19) }

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
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
        <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
          <Menu size={20} color="var(--text-muted)" />
        </button>
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

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px', background: 'var(--bg)', borderRight: '1px solid var(--border)', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '1.25rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>MENU</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[
                { label: 'Exercise Config', target: 'config' },
                { label: 'Analytics', target: 'analytics' },
              ].map(({ label, target }) => (
                <button
                  key={target}
                  onClick={() => { setView(target); setMenuOpen(false) }}
                  style={{ ...btn({ background: view === target ? 'rgba(74,140,106,0.12)' : 'transparent', color: view === target ? 'var(--green-text)' : 'var(--text-muted)', border: '1px solid transparent', justifyContent: 'flex-start', padding: '0.6rem 0.75rem', fontSize: '0.875rem' }) }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--green-text)'; e.currentTarget.style.background = 'rgba(74,140,106,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = view === target ? 'var(--green-text)' : 'var(--text-muted)'; e.currentTarget.style.background = view === target ? 'rgba(74,140,106,0.12)' : 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

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
        {view === 'config' && <ExerciseConfig />}
        {view === 'analytics' && <Analytics />}
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
  const [startedAt, setStartedAt] = useState(() => readDraft(GINASIO_DRAFT)?.startedAt ?? today())
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
    localStorage.setItem(GINASIO_DRAFT, JSON.stringify({ selectedType, duration, startedAt, exerciseRows }))
  }, [selectedType, duration, startedAt, exerciseRows])

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
      duration_minutes: watching ? Math.max(1, Math.round(elapsed / 60)) : (duration ? parseInt(duration) : null),
      sets,
      date: startedAt
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
        <input type="date" value={startedAt.split('T')[0]} onChange={e => setStartedAt(prev => e.target.value + (prev.includes('T') ? prev.substring(prev.indexOf('T')) : ''))} />
      </div>

      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>WORKOUT TYPE</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {workoutTypes.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedType(t.id)
                setExerciseRows([{ exercise_id: '', sets: [{ weight_kg: '', reps: '' }] }])
                if (!startedAt.includes('T')) setStartedAt(localNow())
                startWatch()
              }}
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
  const [startedAt, setStartedAt] = useState(() => readDraft(CAMINHADA_DRAFT)?.startedAt ?? localNow())
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
    localStorage.setItem(CAMINHADA_DRAFT, JSON.stringify({ distance, duration, notes, startedAt }))
  }, [distance, duration, notes, startedAt])

  const handleSave = async () => {
    setSaving(true)
    await axios.post(`${API}/workouts/caminhada`, {
      distance_km: distance ? parseFloat(distance) : null,
      duration_minutes: watching ? Math.max(1, Math.round(elapsed / 60)) : (duration ? parseInt(duration) : null),
      notes: notes || null,
      date: startedAt
    })
    setSaving(false)
    clearWatch()
    localStorage.removeItem(CAMINHADA_DRAFT)
    onSave()
  }

  const handleCancel = () => {
    clearWatch()
    localStorage.removeItem(CAMINHADA_DRAFT)
    onCancel()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>WORKOUT DATE</label>
        <input type="date" value={startedAt.split('T')[0]} onChange={e => setStartedAt(prev => e.target.value + prev.substring(prev.indexOf('T')))} />
      </div>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>DISTANCE (km)</label>
        <input type="number" step="0.1" placeholder="e.g. 5.5" value={distance} onChange={e => setDistance(e.target.value)} />
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
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', color: 'var(--green-text)', flex: 1, letterSpacing: '0.05em' }}>
              {formatElapsed(elapsed)}
            </span>
            <button onClick={stopWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.25rem 0.65rem' })}>
              Stop
            </button>
          </div>
        ) : (
          <input type="number" placeholder="e.g. 45" value={duration} onChange={e => setDuration(e.target.value)} />
        )}
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

function ExerciseConfig() {
  const [workoutTypes, setWorkoutTypes] = useState([])
  const [exercisesByType, setExercisesByType] = useState({})
  const [newNames, setNewNames] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const load = async () => {
    const types = await axios.get(`${API}/workout-types`).then(r => r.data)
    setWorkoutTypes(types)
    const map = {}
    await Promise.all(types.map(async t => {
      const exs = await axios.get(`${API}/exercises`, { params: { workout_type_id: t.id } }).then(r => r.data)
      map[t.id] = exs
    }))
    setExercisesByType(map)
  }

  useEffect(() => { load() }, [])

  const addExercise = async (typeId) => {
    const name = (newNames[typeId] || '').trim()
    if (!name) return
    await axios.post(`${API}/exercises`, { name, workout_type_id: typeId })
    setNewNames(prev => ({ ...prev, [typeId]: '' }))
    await load()
  }

  const removeExercise = async (exerciseId, typeId) => {
    await axios.delete(`${API}/exercise-workout-types/${exerciseId}/${typeId}`)
    await load()
  }

  const deleteExercise = async (exerciseId) => {
    try {
      await axios.delete(`${API}/exercises/${exerciseId}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not delete exercise')
    }
  }

  const updateMuscleGroup = async (exerciseId, muscleGroup) => {
    await axios.patch(`${API}/exercises/${exerciseId}`, { muscle_group: muscleGroup || null })
    setExercisesByType(prev => {
      const next = {}
      for (const tid in prev) {
        next[tid] = prev[tid].map(e => e.id === exerciseId ? { ...e, muscle_group: muscleGroup || null } : e)
      }
      return next
    })
  }

  const startEdit = (ex) => { setEditingId(ex.id); setEditingName(ex.name) }
  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (exerciseId) => {
    const name = editingName.trim()
    if (!name) { cancelEdit(); return }
    try {
      await axios.patch(`${API}/exercises/${exerciseId}`, { name })
      setEditingId(null)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not rename exercise')
    }
  }

  const iconBtn = (extra = {}) => ({ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', flexShrink: 0, ...extra })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.08em' }}>
        EXERCISE CONFIG
      </div>

      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Dumbbell size={16} color="var(--orange)" /> Ginásio
      </div>

      {workoutTypes.map(type => (
        <div key={type.id} style={{ ...card, marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            {type.name.toUpperCase()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
            {(exercisesByType[type.id] || []).length === 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>No exercises yet.</div>
            )}
            {(exercisesByType[type.id] || []).map(ex => (
              <div key={ex.id} style={{ padding: '0.5rem 0.6rem', background: 'var(--surface-hover)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {/* Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {editingId === ex.id ? (
                    <>
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(ex.id); if (e.key === 'Escape') cancelEdit() }}
                        style={{ flex: 1, fontSize: '0.85rem' }}
                      />
                      <button onClick={() => saveEdit(ex.id)} style={iconBtn()}><Check size={14} color="var(--orange)" /></button>
                      <button onClick={cancelEdit} style={iconBtn()}><X size={14} color="var(--text-muted)" /></button>
                    </>
                  ) : (
                    <>
                      <span
                        onClick={() => startEdit(ex)}
                        title="Click to rename"
                        style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {ex.name}
                      </span>
                      <button onClick={() => deleteExercise(ex.id)} style={iconBtn()} title="Delete exercise">
                        <Trash2 size={13} color="var(--text-muted)" />
                      </button>
                      <button onClick={() => removeExercise(ex.id, type.id)} style={iconBtn()} title="Remove from this workout type">
                        <X size={14} color="var(--text-muted)" />
                      </button>
                    </>
                  )}
                </div>
                {/* Muscle group row */}
                <select
                  value={ex.muscle_group || ''}
                  onChange={e => updateMuscleGroup(ex.id, e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem', width: '100%' }}
                >
                  <option value="">— muscle group —</option>
                  {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <input
              placeholder="Add exercise..."
              value={newNames[type.id] || ''}
              onChange={e => setNewNames(prev => ({ ...prev, [type.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExercise(type.id)}
            />
            <button onClick={() => addExercise(type.id)} style={btn({ background: 'var(--orange)', color: 'white', flexShrink: 0 })}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Analytics() {
  const [range, setRange] = useState(8)
  const [rawVolume, setRawVolume] = useState([])
  const [freqData, setFreqData] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [progExId, setProgExId] = useState('')
  const [progData, setProgData] = useState([])

  useEffect(() => {
    axios.get(`${API}/analytics/volume`, { params: { weeks: range } }).then(r => setRawVolume(r.data))
    axios.get(`${API}/analytics/frequency`, { params: { weeks: range } }).then(r => setFreqData(r.data))
  }, [range])

  useEffect(() => {
    axios.get(`${API}/exercises`).then(r => setAllExercises(r.data))
  }, [])

  useEffect(() => {
    if (!progExId) { setProgData([]); return }
    axios.get(`${API}/analytics/progression`, { params: { exercise_id: progExId } }).then(r => setProgData(r.data))
  }, [progExId])

  // Pivot volume rows → { week, MuscleA: vol, MuscleB: vol, ... }
  const muscleKeys = [...new Set(rawVolume.map(r => r.muscle_group))].sort()
  const colorMap = Object.fromEntries(muscleKeys.map((m, i) => [m, CHART_COLORS[i % CHART_COLORS.length]]))
  const volumeChartData = (() => {
    const weeks = [...new Set(rawVolume.map(r => r.week))].sort()
    return weeks.map(w => {
      const obj = { week: fmtShortDate(w) }
      muscleKeys.forEach(m => {
        const row = rawVolume.find(r => r.week === w && r.muscle_group === m)
        obj[m] = row ? row.volume : 0
      })
      return obj
    })
  })()

  // Build calendar grid aligned to Monday
  const todayStr = toLocalDateStr(new Date())
  const freqGrid = (() => {
    const start = new Date()
    start.setDate(start.getDate() - range * 7)
    const dow = start.getDay()
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))
    const days = []
    for (let d = new Date(start); toLocalDateStr(d) <= todayStr; d.setDate(d.getDate() + 1)) {
      const ds = toLocalDateStr(d)
      days.push({ date: ds, workout: freqData.find(f => f.day === ds) || null })
    }
    const weeks = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    return weeks
  })()

  const secCard = { ...card, marginBottom: '1.25rem' }
  const secLabel = { fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '1rem' }
  const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }

  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', letterSpacing: '0.08em' }}>ANALYTICS</div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[{ label: '4w', val: 4 }, { label: '8w', val: 8 }, { label: '3m', val: 12 }].map(({ label, val }) => (
          <button
            key={val}
            onClick={() => setRange(val)}
            style={btn({
              background: range === val ? 'var(--orange)' : 'var(--surface)',
              color: range === val ? 'white' : 'var(--text-muted)',
              border: `1px solid ${range === val ? 'var(--orange)' : 'var(--border)'}`,
              padding: '0.35rem 0.9rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.78rem',
            })}
          >{label}</button>
        ))}
      </div>

      {/* Volume by muscle group */}
      <div style={secCard}>
        <div style={secLabel}>VOLUME BY MUSCLE GROUP <span style={{ opacity: 0.55, fontWeight: 400 }}>(total reps / week)</span></div>
        {muscleKeys.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0', fontFamily: 'JetBrains Mono, monospace' }}>
            No data — assign muscle groups in Exercise Config first
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeChartData} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text)', marginBottom: '0.4rem', fontWeight: 600 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {muscleKeys.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={colorMap[m]} radius={i === muscleKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              {muscleKeys.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: colorMap[m], flexShrink: 0 }} />
                  {m.split(' (')[0]}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Training frequency calendar */}
      <div style={secCard}>
        <div style={secLabel}>TRAINING FREQUENCY</div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {[['var(--orange)', 'Ginásio'], ['var(--green-text)', 'Caminhada'], ['var(--surface-hover)', 'Rest']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: color, border: '1px solid var(--border)', flexShrink: 0 }} /> {label}
            </div>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 22px)', gap: '3px', minWidth: 'fit-content' }}>
            <div />
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '22px' }}>{d}</div>
            ))}
            {freqGrid.map((week, wi) => (
              <React.Fragment key={wi}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: '22px', textAlign: 'right', paddingRight: '4px' }}>
                  {fmtShortDate(week[0].date)}
                </div>
                {week.map((day, di) => {
                  const isGym = day.workout?.type === 'ginasio'
                  const isWalk = day.workout?.type === 'caminhada'
                  const future = day.date > todayStr
                  return (
                    <div
                      key={di}
                      title={future ? '' : day.workout ? `${day.date}: ${isGym ? (day.workout.workout_type_name || 'Ginásio') : 'Caminhada'}` : day.date}
                      style={{
                        width: 22, height: 22, borderRadius: 3,
                        background: future ? 'transparent' : isGym ? 'var(--orange)' : isWalk ? 'var(--green-text)' : 'var(--surface-hover)',
                        border: future ? 'none' : '1px solid var(--border)',
                        opacity: future ? 0 : 1,
                      }}
                    />
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Strength progression */}
      <div style={secCard}>
        <div style={secLabel}>STRENGTH PROGRESSION</div>
        <select value={progExId} onChange={e => setProgExId(e.target.value)} style={{ marginBottom: '1rem', fontSize: '0.85rem', width: '100%' }}>
          <option value="">Select an exercise...</option>
          {allExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {progExId && progData.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0', fontFamily: 'JetBrains Mono, monospace' }}>
            No weighted sets recorded for this exercise
          </div>
        )}
        {progData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progData} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtShortDate} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}kg`} width={44} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--text)', marginBottom: '0.3rem', fontWeight: 600 }}
                formatter={v => [`${v} kg`, 'Top set']}
                labelFormatter={fmtShortDate}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <Line type="monotone" dataKey="max_weight" stroke="var(--orange)" strokeWidth={2} dot={{ fill: 'var(--orange)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: 'var(--orange)', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}