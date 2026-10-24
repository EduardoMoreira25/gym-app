import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, X, ChevronLeft, Dumbbell, Footprints, Trash2, Clock, MapPin, ChevronDown, ChevronUp, Filter, Menu, Check } from 'lucide-react'

const MUSCLE_GROUP_CATEGORIES = {
  'Chest':     ['Chest (pectoralis major – mid/overall)', 'Upper Chest (clavicular head)', 'Lower Chest (sternal head)'],
  'Shoulders': ['Front Delts (anterior deltoid)', 'Side Delts (lateral deltoid)', 'Rear Delts (posterior deltoid)'],
  'Back':      ['Upper Back (traps, rhomboids)', 'Lats (latissimus dorsi – width)', 'Mid Back (rhomboids, mid-traps)', 'Lower Back (erector spinae)', 'Traps (upper, mid, lower trapezius)'],
  'Arms':      ['Biceps (biceps brachii)', 'Brachialis (under the bicep)', 'Triceps (all 3 heads: long, lateral, medial)', 'Forearms (flexors & extensors)'],
  'Legs':      ['Quads (quadriceps – front of thigh)', 'Hamstrings (back of thigh)', 'Glutes (gluteus maximus, medius, minimus)', 'Hip Abductors (outer thigh)', 'Hip Adductors (inner thigh)', 'Calves (gastrocnemius & soleus)'],
  'Core':      ['Abs (rectus abdominis – the "six pack")', 'Obliques (side abs)', 'Transverse Abdominis (deep core)', 'Serratus Anterior (side of ribcage)'],
  'Other':     ['Neck (sternocleidomastoid, etc.)'],
}

const CATEGORY_COLORS = {
  'Chest':     '#e53535',
  'Shoulders': '#f97316',
  'Arms':      '#9b9b9b',
  'Back':      '#3b82f6',
  'Legs':      '#22c55e',
  'Core':      '#eab308',
  'Other':     '#8a8a8a',
}

const MUSCLE_GROUPS = Object.values(MUSCLE_GROUP_CATEGORIES).flat()

const WORKOUT_TYPE_COLORS = { 'Push': '#e53535', 'Pull': '#3b82f6', 'Legs': '#22c55e' }
const WORKOUT_TYPE_ICONS = { 'Push': '/gym/push.svg', 'Pull': '/gym/pull.svg', 'Legs': '/gym/legs.svg' }
const CAMINHADA_COLOR = '#c8c8c8'

function WorkoutTypeIcon({ typeName, size = 18 }) {
  const src = WORKOUT_TYPE_ICONS[typeName]
  if (!src) return <Dumbbell size={size} color="var(--orange)" />
  return <img src={src} width={size * 2.2} height={size * 2.2} alt={typeName} style={{ filter: 'invert(1)', opacity: 0.85, display: 'block' }} />
}

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
  borderRadius: '12px',
  padding: '0.55rem 1.1rem',
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
  borderRadius: '16px',
  padding: '1.25rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
}

const today = () => localNow().split('T')[0]
const localNow = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19) }

function Dropdown({ value, onChange, options, placeholder = 'Select...', style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const selected = options.find(o => !o.isGroup && String(o.value) === String(value))

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.5rem 0.65rem', color: selected ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', minWidth: 0 }}>
          {selected?.dot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selected.dot, flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? selected.label : placeholder}</span>
        </span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.4rem' }} /> : <ChevronDown size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.4rem' }} />}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
          maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {options.map((o, i) => {
            if (o.isGroup) {
              return (
                <div key={`grp-${o.label}`} style={{
                  padding: '0.35rem 0.75rem 0.25rem',
                  fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.09em', fontWeight: 700,
                  color: o.color || 'var(--text-muted)',
                  background: (o.color || '#888') + '18',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: o.color || '#888', flexShrink: 0 }} />
                  {o.label.toUpperCase()}
                </div>
              )
            }
            const sel = String(o.value) === String(value)
            return (
              <div key={o.value}
                onClick={() => { if (o.value !== '') { onChange(o.value); setOpen(false) } else { onChange(''); setOpen(false) } }}
                style={{
                  padding: '0.55rem 0.75rem', fontSize: '0.85rem',
                  fontFamily: 'Space Grotesk, sans-serif', cursor: o.value === '' ? 'default' : 'pointer',
                  color: sel ? 'var(--orange)' : o.value === '' ? 'var(--text-muted)' : 'var(--text)',
                  background: sel ? 'var(--orange-dim)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface-hover)' }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? 'var(--orange-dim)' : 'transparent' }}
              >
                {o.dot && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: o.dot, flexShrink: 0 }} />}
                {o.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const fmtElapsed = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

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
  const [liveTimer, setLiveTimer] = useState(null)
  const [hasDraft, setHasDraft] = useState(() => !!(readDraft(GINASIO_DRAFT) || readDraft(CAMINHADA_DRAFT)))
  const [draftType, setDraftType] = useState(() => readDraft(GINASIO_DRAFT) ? 'ginasio' : readDraft(CAMINHADA_DRAFT) ? 'caminhada' : null)

  useEffect(() => {
    const tick = () => {
      const gDraft = readDraft(GINASIO_DRAFT)
      const cDraft = readDraft(CAMINHADA_DRAFT)
      const draft = gDraft || cDraft
      const type = gDraft ? 'ginasio' : cDraft ? 'caminhada' : null
      setHasDraft(!!draft)
      setDraftType(type)
      if (draft?.timerZeroAt) {
        setLiveTimer(fmtElapsed(Math.floor((Date.now() - draft.timerZeroAt) / 1000)))
      } else {
        setLiveTimer(null)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

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
        padding: '0.9rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
        <span onClick={() => setView('list')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginRight: 'auto', cursor: 'pointer' }}>
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
            {hasDraft && view !== draftType && (() => {
              const bc = draftType === 'caminhada' ? CAMINHADA_COLOR : 'var(--orange)'
              const bg = draftType === 'caminhada' ? 'rgba(200,200,200,0.06)' : 'var(--orange-dim2)'
              const dot = draftType === 'caminhada' ? CAMINHADA_COLOR : '#4caf50'
              return (
                <button onClick={() => { setView(draftType); setMenuOpen(false) }} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                  background: bg, border: `1px solid ${bc}`, borderRadius: '10px',
                  padding: '0.65rem 0.75rem', marginBottom: '1rem', cursor: 'pointer', width: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 0 2px ${dot}40` }} />
                    <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: bc, fontWeight: 700, letterSpacing: '0.06em', flex: 1 }}>
                      WORKOUT IN PROGRESS
                    </span>
                  </div>
                  {liveTimer && (
                    <span style={{ fontSize: '1.15rem', fontFamily: 'JetBrains Mono, monospace', color: bc, letterSpacing: '0.05em', paddingLeft: '1.25rem' }}>
                      {liveTimer}
                    </span>
                  )}
                </button>
              )
            })()}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[
                { label: 'Exercise Config', target: 'config' },
                { label: 'Analytics', target: 'analytics' },
                { label: 'Nutrition', target: 'nutrition' },
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
                    <Dropdown
                      value={filterType}
                      onChange={setFilterType}
                      options={[{ value: '', label: 'All' }, { value: 'ginasio', label: 'Ginásio' }, { value: 'caminhada', label: 'Caminhada' }]}
                    />
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

            {hasDraft && (
              <>
                <style>{`@keyframes pulse-dot-green{0%{box-shadow:0 0 0 0 #4caf5090;transform:scale(1)}50%{box-shadow:0 0 0 10px #4caf5000;transform:scale(1.3)}100%{box-shadow:0 0 0 0 #4caf5000;transform:scale(1)}}@keyframes pulse-dot-grey{0%{box-shadow:0 0 0 0 #c8c8c890;transform:scale(1)}50%{box-shadow:0 0 0 10px #c8c8c800;transform:scale(1.3)}100%{box-shadow:0 0 0 0 #c8c8c800;transform:scale(1)}}`}</style>
                <button onClick={() => setView(draftType)} style={{
                  ...card, display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', padding: '0.9rem 1.1rem', marginBottom: '0.75rem', width: '100%', textAlign: 'left',
                }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: draftType === 'caminhada' ? CAMINHADA_COLOR : '#4caf50', flexShrink: 0, animation: `${draftType === 'caminhada' ? 'pulse-dot-grey' : 'pulse-dot-green'} 1.6s ease-in-out infinite` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
                      WORKOUT IN PROGRESS
                    </div>
                    {liveTimer && (
                      <div style={{ fontSize: '1.1rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
                        {liveTimer}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'white', fontFamily: 'JetBrains Mono, monospace' }}>Continue →</span>
                </button>
              </>
            )}

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
                          background: 'rgba(200,200,200,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {w.type === 'ginasio'
                            ? <WorkoutTypeIcon typeName={w.workout_type_name} size={18} />
                            : <Footprints size={18} color={CAMINHADA_COLOR} />}
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
                onMouseEnter={e => { e.currentTarget.style.borderColor = CAMINHADA_COLOR; e.currentTarget.style.background = 'rgba(200,200,200,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
              >
                <Footprints size={28} color={CAMINHADA_COLOR} style={{ marginBottom: '0.75rem' }} />
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
        {view === 'nutrition' && <NutritionPage />}
        {view === 'analytics' && <Analytics onWeekClick={({ from, to }) => {
          setFilterFrom(from)
          setFilterTo(to)
          setShowFilters(true)
          setPage(1)
          setView('list')
        }} />}
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
  const [saveError, setSaveError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [watching, setWatching] = useState(false)
  const [timerZeroAt, setTimerZeroAt] = useState(() => readDraft(GINASIO_DRAFT)?.timerZeroAt ?? null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  const computeSetsPerCat = () => {
    const counts = {}
    exerciseRows.forEach(row => {
      if (!row.exercise_id) return
      const ex = exercises.find(e => String(e.id) === String(row.exercise_id))
      const cat = ex?.muscle_group_category_name || null
      const doneSets = row.sets.filter(s => s.reps && parseInt(s.reps) > 0).length
      if (doneSets > 0) {
        const key = cat || '—'
        counts[key] = (counts[key] || 0) + doneSets
      }
    })
    return counts
  }

  const startWatch = () => {
    if (intervalRef.current) return
    const zero = Date.now() - elapsed * 1000
    startTimeRef.current = zero
    setTimerZeroAt(zero)
    setWatching(true)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - zero) / 1000))
    }, 1000)
  }

  const stopWatch = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setWatching(false)
    setTimerZeroAt(null)
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

  // Inactivity check + timer auto-resume on mount
  useEffect(() => {
    const draft = readDraft(GINASIO_DRAFT)
    if (draft?.lastInputAt && Date.now() - draft.lastInputAt > 25 * 60 * 1000) {
      localStorage.removeItem(GINASIO_DRAFT)
      onCancel()
      return
    }
    if (draft?.timerZeroAt) {
      const zero = draft.timerZeroAt
      startTimeRef.current = zero
      setElapsed(Math.floor((Date.now() - zero) / 1000))
      setWatching(true)
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - zero) / 1000))
      }, 1000)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(GINASIO_DRAFT, JSON.stringify({ selectedType, duration, startedAt, exerciseRows, timerZeroAt, lastInputAt: Date.now() }))
  }, [selectedType, duration, startedAt, exerciseRows, timerZeroAt])

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
    const hasReps = exerciseRows.some(row => row.exercise_id && row.sets.some(s => s.reps && parseInt(s.reps) > 0))
    if (!hasReps) { setSaveError('Add at least one set with reps before saving.'); return }
    const emptySet = exerciseRows.some(row => row.exercise_id && row.sets.some(s => !s.reps || parseInt(s.reps) <= 0))
    if (emptySet) { setSaveError('Fill in reps for every set before saving.'); return }
    setSaveError('')
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
              style={(() => {
                const c = WORKOUT_TYPE_COLORS[t.name] || 'var(--orange)'
                return {
                  padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1px solid',
                  borderColor: selectedType == t.id ? c : 'var(--border)',
                  background: selectedType == t.id ? c + '22' : 'transparent',
                  color: selectedType == t.id ? c : 'var(--text-muted)',
                  fontSize: '0.85rem'
                }
              })()}
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
        {exerciseRows.map((row, rowIdx) => {
          const selEx = exercises.find(e => String(e.id) === String(row.exercise_id))
          const rowCatColor = selEx?.muscle_group_category_name
            ? (CATEGORY_COLORS[selEx.muscle_group_category_name] || 'var(--orange)')
            : 'var(--orange)'

          const byCategory = {}
          const uncategorized = []
          exercises.forEach(e => {
            const cat = e.muscle_group_category_name
            if (cat) { if (!byCategory[cat]) byCategory[cat] = []; byCategory[cat].push(e) }
            else uncategorized.push(e)
          })
          const groupedOpts = [{ value: '', label: 'Select exercise...' }]
          Object.keys(CATEGORY_COLORS).forEach(cat => {
            if (byCategory[cat]?.length) {
              groupedOpts.push({ isGroup: true, label: cat, color: CATEGORY_COLORS[cat] })
              byCategory[cat].forEach(e => groupedOpts.push({ value: String(e.id), label: e.name, dot: CATEGORY_COLORS[cat] }))
            }
          })
          if (uncategorized.length) {
            groupedOpts.push({ isGroup: true, label: 'Other', color: '#8a8a8a' })
            uncategorized.forEach(e => groupedOpts.push({ value: String(e.id), label: e.name }))
          }

          return (
          <div key={rowIdx} style={{ borderLeft: `2px solid ${rowCatColor}`, paddingLeft: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Dropdown
                value={row.exercise_id}
                placeholder="Select exercise..."
                options={groupedOpts}
                onChange={async exId => {
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
                }}
              />
              <button onClick={() => removeExerciseRow(rowIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {row.sets.map((s, setIdx) => (
                <div key={setIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', width: '28px', flexShrink: 0 }}>S{setIdx + 1}</span>
                  <input type="number" placeholder="kg" value={s.weight_kg} onChange={e => updateSet(rowIdx, setIdx, 'weight_kg', e.target.value)} style={{ width: '62px' }} />
                  <input type="number" placeholder="reps" value={s.reps} onChange={e => updateSet(rowIdx, setIdx, 'reps', e.target.value)} style={{ width: '58px' }} />
                  {(!s.reps || s.reps === '') && [8, 10, 12].map(rep => (
                    <button key={rep} onClick={() => updateSet(rowIdx, setIdx, 'reps', String(rep))}
                      style={{
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#666',
                        borderRadius: '6px',
                        fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
                        cursor: 'pointer', flexShrink: 0,
                      }}>
                      {rep}
                    </button>
                  ))}
                  {row.sets.length > 1 && (
                    <button onClick={() => removeSet(rowIdx, setIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
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
          )
        })}
        <button onClick={addExerciseRow} style={btn({ background: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid var(--orange)', marginBottom: '1rem' })}>
          <Plus size={14} /> Add exercise
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <input placeholder="Add new exercise to list..." value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExercise()} />
          <button onClick={addExercise} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', flexShrink: 0 })}><Plus size={14} /></button>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', gap: 0, padding: 0, overflow: 'hidden' }}>
        {/* Left: timer — shrinks to content so right side gets remaining space */}
        <div style={{ flexShrink: 0, padding: '1rem 0.75rem 1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>DURATION</label>
          {watching ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', color: 'var(--orange)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                {formatElapsed(elapsed)}
              </span>
              <button onClick={stopWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.72rem', padding: '0.2rem 0.55rem' })}>
                Stop
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input type="number" placeholder="60" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '64px' }} />
              <button onClick={startWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.72rem', padding: '0.2rem 0.45rem' })}>
                ▶
              </button>
            </div>
          )}
        </div>

        <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />

        {/* Right: sets per category — takes remaining width, wraps */}
        <div style={{ flex: 1, minWidth: 0, padding: '1rem 1.25rem 1rem 0.75rem', display: 'flex', flexWrap: 'wrap', alignContent: 'center', gap: '0.15rem 0.9rem' }}>
          {Object.entries(computeSetsPerCat()).length === 0 ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>no sets yet</span>
          ) : (
            Object.entries(computeSetsPerCat()).map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat] || '#8a8a8a'
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'JetBrains Mono, monospace', color, lineHeight: 1.15 }}>{cat}</span>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'JetBrains Mono, monospace', color: 'white', fontWeight: 700, lineHeight: 1.15 }}>{count}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {saveError && (
        <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: '-0.5rem' }}>
          {saveError}
        </div>
      )}
      <button onClick={handleSave} disabled={saving} style={btn({ background: 'var(--green-text)', color: 'white', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
      <button onClick={() => setShowCancelConfirm(true)} style={btn({ background: '#080808', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        Cancel Workout
      </button>

      {showCancelConfirm && (() => {
        const catCounts = computeSetsPerCat()
        const totalSets = Object.values(catCounts).reduce((a, b) => a + b, 0)
        return (
          <>
            <div onClick={() => setShowCancelConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100 }} />
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
              background: 'var(--surface)',
              borderRadius: '20px 20px 0 0',
              padding: `1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
              boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
            }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 1.25rem' }} />

              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>
                Cancel this workout?
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: totalSets > 0 ? '1rem' : '1.5rem', fontFamily: 'JetBrains Mono, monospace' }}>
                {elapsed > 0 ? formatElapsed(elapsed) + ' elapsed' : ''}
                {elapsed > 0 && totalSets > 0 ? '  ·  ' : ''}
                {totalSets > 0 ? `${totalSets} set${totalSets !== 1 ? 's' : ''} logged` : ''}
                {elapsed === 0 && totalSets === 0 ? 'No sets logged yet' : ''}
              </div>

              {totalSets > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                  marginBottom: '1.5rem', padding: '0.85rem',
                  background: 'var(--surface-hover)', borderRadius: '12px',
                }}>
                  {Object.entries(catCounts).map(([cat, count]) => {
                    const color = CATEGORY_COLORS[cat] || '#8a8a8a'
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.6rem', color, fontWeight: 600, lineHeight: 1.1 }}>{cat}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.6rem', color: 'white', fontWeight: 700, lineHeight: 1.1 }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button onClick={() => setShowCancelConfirm(false)}
                  style={btn({ background: 'var(--green-text)', color: 'white', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem', fontWeight: 600 })}>
                  Keep Going
                </button>
                <button onClick={() => { setShowCancelConfirm(false); handleCancel() }}
                  style={btn({ background: 'transparent', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem' })}>
                  Yes, Cancel Workout
                </button>
              </div>
            </div>
          </>
        )
      })()}
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
  const [timerZeroAt, setTimerZeroAt] = useState(() => readDraft(CAMINHADA_DRAFT)?.timerZeroAt ?? null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  const startWatch = () => {
    if (intervalRef.current) return
    const zero = Date.now() - elapsed * 1000
    startTimeRef.current = zero
    setTimerZeroAt(zero)
    setWatching(true)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - zero) / 1000))
    }, 1000)
  }

  const stopWatch = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setWatching(false)
    setTimerZeroAt(null)
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
    const draft = readDraft(CAMINHADA_DRAFT)
    if (draft?.lastInputAt && Date.now() - draft.lastInputAt > 90 * 60 * 1000) {
      localStorage.removeItem(CAMINHADA_DRAFT)
      onCancel()
      return
    }
    if (draft?.timerZeroAt) {
      const zero = draft.timerZeroAt
      startTimeRef.current = zero
      setElapsed(Math.floor((Date.now() - zero) / 1000))
      setWatching(true)
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - zero) / 1000))
      }, 1000)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(CAMINHADA_DRAFT, JSON.stringify({ distance, duration, notes, startedAt, timerZeroAt, lastInputAt: Date.now() }))
  }, [distance, duration, notes, startedAt, timerZeroAt])

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
      <div style={{ ...card, display: 'flex', gap: 0, padding: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '1rem 1rem 1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>DURATION</label>
          {watching ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', color: CAMINHADA_COLOR, letterSpacing: '0.05em' }}>
                {formatElapsed(elapsed)}
              </span>
              <button onClick={stopWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.72rem', padding: '0.2rem 0.55rem' })}>
                Stop
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="number" placeholder="e.g. 45" value={duration} onChange={e => setDuration(e.target.value)} style={{ flex: 1 }} />
              <button onClick={startWatch} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.72rem', padding: '0.2rem 0.55rem' })}>
                ▶
              </button>
            </div>
          )}
        </div>
        <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '1rem 1.25rem 1rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>DISTANCE</label>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', color: distance ? CAMINHADA_COLOR : 'var(--text-muted)' }}>
            {distance ? `${distance} km` : '—'}
          </span>
        </div>
      </div>
      <div style={card}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontFamily: 'JetBrains Mono, monospace' }}>NOTES</label>
        <textarea rows={3} placeholder="How did it go?" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
      </div>
      <button onClick={handleSave} disabled={saving} style={btn({ background: 'var(--green-text)', color: 'white', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        {saving ? 'Saving...' : 'Save Workout'}
      </button>
      <button onClick={() => setShowCancelConfirm(true)} style={btn({ background: '#080808', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' })}>
        Cancel Workout
      </button>

      {showCancelConfirm && (
        <>
          <div onClick={() => setShowCancelConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
            background: 'var(--surface)', borderRadius: '20px 20px 0 0',
            padding: `1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
            boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 1.25rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>
              Cancel this walk?
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontFamily: 'JetBrains Mono, monospace' }}>
              {elapsed > 0 ? formatElapsed(elapsed) + ' elapsed' : 'Nothing logged yet'}
              {elapsed > 0 && distance ? `  ·  ${distance} km` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button onClick={() => setShowCancelConfirm(false)}
                style={btn({ background: 'var(--green-text)', color: 'white', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem', fontWeight: 600 })}>
                Keep Going
              </button>
              <button onClick={() => { setShowCancelConfirm(false); handleCancel() }}
                style={btn({ background: 'transparent', color: '#b91c1c', border: '1px solid #7f1d1d', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem' })}>
                Yes, Cancel Workout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const ZONE_COLORS = { LIGHT: '#4fc3f7', MODERATE: '#66bb6a', VIGOROUS: '#ffa726', PEAK: '#ef5350' }
const ZONE_LABELS = { LIGHT: 'Light', MODERATE: 'Moderate', VIGOROUS: 'Vigorous', PEAK: 'Peak' }

function zoneForBpm(bpm, zones) {
  // zones: { LIGHT: {min,max}, MODERATE: {min,max}, ... }
  for (const key of ['PEAK', 'VIGOROUS', 'MODERATE', 'LIGHT']) {
    if (zones[key] && bpm >= zones[key].min) return key
  }
  return 'LIGHT'
}

function HRSparkline({ start, durationMinutes }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!start || !durationMinutes) return
    const s = new Date(start)
    const e = new Date(s.getTime() + durationMinutes * 60_000)
    axios.get(`${API}/health/hr_during`, {
      params: { start: s.toISOString(), end: e.toISOString() }
    }).then(r => setData(r.data)).catch(() => setData({ points: [], zones: {} }))
  }, [start, durationMinutes])

  if (data === null) return (
    <div style={{ ...card, padding: '1rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
      Loading heart rate…
    </div>
  )

  const { points, zones } = data
  if (!points || points.length < 2) return null

  const W = 600, H = 80
  const bpms = points.map(p => p.bpm)
  const minBpm = Math.min(...bpms), maxBpm = Math.max(...bpms)
  const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
  const yPad = 6
  const range = maxBpm - minBpm || 1
  const t0 = new Date(points[0].t).getTime()
  const tEnd = new Date(points[points.length - 1].t).getTime()
  const tRange = tEnd - t0 || 1

  const px = (t) => ((new Date(t).getTime() - t0) / tRange) * W
  const py = (bpm) => yPad + (H - yPad * 2) - ((bpm - minBpm) / range) * (H - yPad * 2)

  // Group consecutive points by zone into segments for coloring
  const segments = []
  let cur = null
  for (const p of points) {
    const z = zoneForBpm(p.bpm, zones)
    if (!cur || cur.zone !== z) {
      if (cur) segments.push(cur)
      cur = { zone: z, pts: [] }
    }
    cur.pts.push(p)
  }
  if (cur) segments.push(cur)

  // Each segment: draw line + filled area down to baseline
  const segPaths = segments.map(seg => {
    // Include last point of previous segment as first point so segments connect
    const linePath = seg.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t).toFixed(1)},${py(p.bpm).toFixed(1)}`).join(' ')
    const fillPath = `${linePath} L${px(seg.pts[seg.pts.length - 1].t).toFixed(1)},${H} L${px(seg.pts[0].t).toFixed(1)},${H} Z`
    return { zone: seg.zone, linePath, fillPath }
  })

  // Zone time breakdown (minutes per zone)
  const zoneMins = {}
  for (const seg of segments) {
    if (seg.pts.length < 2) continue
    const dur = (new Date(seg.pts[seg.pts.length - 1].t) - new Date(seg.pts[0].t)) / 60000
    zoneMins[seg.zone] = (zoneMins[seg.zone] || 0) + dur
  }

  const zoneOrder = ['LIGHT', 'MODERATE', 'VIGOROUS', 'PEAK']

  return (
    <div style={{ ...card, padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Heart Rate</span>
        <div style={{ display: 'flex', gap: '1rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>avg <span style={{ color: 'var(--text)', fontWeight: 600 }}>{avgBpm}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>min <span style={{ color: ZONE_COLORS.LIGHT, fontWeight: 600 }}>{minBpm}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>max <span style={{ color: ZONE_COLORS.PEAK, fontWeight: 600 }}>{maxBpm}</span></span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '88px', display: 'block' }}>
        {segPaths.map((s, i) => (
          <g key={i}>
            <path d={s.fillPath} fill={ZONE_COLORS[s.zone]} opacity="0.18" />
            <path d={s.linePath} fill="none" stroke={ZONE_COLORS[s.zone]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        <line x1="0" y1={py(avgBpm).toFixed(1)} x2={W} y2={py(avgBpm).toFixed(1)}
          stroke="rgba(128,128,128,0.4)" strokeWidth="0.8" strokeDasharray="4 3" />
      </svg>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        {zoneOrder.filter(z => zones[z]).map(z => (
          <span key={z} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: ZONE_COLORS[z] }} />
            {ZONE_LABELS[z]} {zones[z].min}–{zones[z].max} bpm
            {zoneMins[z] ? <span style={{ color: 'var(--text)', fontWeight: 600 }}> {Math.round(zoneMins[z])}m</span> : null}
          </span>
        ))}
      </div>
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
          background: 'rgba(200,200,200,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {workout.type === 'ginasio' ? <WorkoutTypeIcon typeName={workout.workout_type_name} size={22} /> : <Footprints size={22} color={CAMINHADA_COLOR} />}
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

      {workout.duration_minutes && (
        <HRSparkline start={workout.date} durationMinutes={workout.duration_minutes} />
      )}

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
                <MapPin size={16} color={CAMINHADA_COLOR} />
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

function CategoryChips({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
      {Object.keys(CATEGORY_COLORS).map(cat => {
        const sel = value === cat
        const color = CATEGORY_COLORS[cat]
        return (
          <button key={cat} type="button"
            onClick={() => onChange(sel ? null : cat)}
            style={{
              padding: '0.22rem 0.55rem',
              borderRadius: '20px',
              border: `1.5px solid ${sel ? color : 'var(--border)'}`,
              background: sel ? color + '28' : 'transparent',
              color: sel ? color : 'var(--text-muted)',
              fontSize: '1.15rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: sel ? 700 : 400,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              transition: 'all 0.12s',
            }}>
            {cat.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

function ExerciseConfig() {
  const [workoutTypes, setWorkoutTypes] = useState([])
  const [exercisesByType, setExercisesByType] = useState({})
  const [categories, setCategories] = useState([])
  const [newNames, setNewNames] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const load = async () => {
    const [types, cats] = await Promise.all([
      axios.get(`${API}/workout-types`).then(r => r.data),
      axios.get(`${API}/muscle-group-categories`).then(r => r.data),
    ])
    setWorkoutTypes(types)
    setCategories(cats)
    const map = {}
    await Promise.all(types.map(async t => {
      const exs = await axios.get(`${API}/exercises`, { params: { workout_type_id: t.id } }).then(r => r.data)
      map[t.id] = exs
    }))
    setExercisesByType(map)
  }

  useEffect(() => { load() }, [])

  const catById = (id) => categories.find(c => c.id === id)
  const catByName = (name) => categories.find(c => c.name === name)

  const patchExercise = (exerciseId, patch) => {
    setExercisesByType(prev => {
      const next = {}
      for (const tid in prev) {
        next[tid] = prev[tid].map(e => e.id === exerciseId ? { ...e, ...patch } : e)
      }
      return next
    })
  }

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

  const updateCategory = async (exerciseId, catName) => {
    const cat = catName ? catByName(catName) : null
    const catId = cat ? cat.id : null
    await axios.patch(`${API}/exercises/${exerciseId}`, { muscle_group_category_id: catId })
    patchExercise(exerciseId, { muscle_group_category_id: catId, muscle_group_category_name: catName || null })
  }

  const updateMuscleGroup = async (exerciseId, muscleGroup) => {
    await axios.patch(`${API}/exercises/${exerciseId}`, { muscle_group: muscleGroup || null })
    patchExercise(exerciseId, { muscle_group: muscleGroup || null })
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

  const iconBtn = (extra = {}) => ({ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', flexShrink: 0, ...extra })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        EXERCISE CONFIG
      </div>

      {workoutTypes.map(type => {
        const accentColor = WORKOUT_TYPE_COLORS[type.name] || 'var(--orange)'
        const exList = exercisesByType[type.id] || []
        return (
          <div key={type.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.1rem',
              background: accentColor + '14',
              borderBottom: `2px solid ${accentColor}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <WorkoutTypeIcon typeName={type.name} size={14} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 700, color: accentColor, letterSpacing: '0.1em' }}>
                  {type.name.toUpperCase()}
                </span>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {exList.length} exercise{exList.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {exList.length === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '0.75rem 0' }}>
                  No exercises yet
                </div>
              )}

              {exList.map(ex => {
                const catName = ex.muscle_group_category_name || null
                const catColor = catName ? (CATEGORY_COLORS[catName] || '#8a8a8a') : 'var(--border)'
                const detailOptions = catName
                  ? (MUSCLE_GROUP_CATEGORIES[catName] || [])
                  : Object.values(MUSCLE_GROUP_CATEGORIES).flat()

                return (
                  <div key={ex.id} style={{
                    borderLeft: `4px solid ${catColor}`,
                    borderRadius: '8px',
                    background: 'var(--surface-hover)',
                    padding: '0.6rem 0.7rem 0.65rem 0.75rem',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {editingId === ex.id ? (
                        <>
                          <input
                            autoFocus
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(ex.id); if (e.key === 'Escape') cancelEdit() }}
                            style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}
                          />
                          <button onClick={() => saveEdit(ex.id)} style={iconBtn()}><Check size={15} color="var(--orange)" /></button>
                          <button onClick={cancelEdit} style={iconBtn()}><X size={14} color="var(--text-muted)" /></button>
                        </>
                      ) : (
                        <>
                          <span onClick={() => startEdit(ex)} title="Tap to rename"
                            style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ex.name}
                          </span>
                          <button onClick={() => deleteExercise(ex.id)} style={iconBtn()} title="Delete exercise permanently">
                            <Trash2 size={13} color="var(--text-muted)" />
                          </button>
                          <button onClick={() => removeExercise(ex.id, type.id)} style={iconBtn()} title="Remove from this day">
                            <X size={14} color="var(--text-muted)" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Category chips */}
                    <CategoryChips value={catName} onChange={name => updateCategory(ex.id, name)} />

                    {/* Detail muscle group — only shown when a category is selected */}
                    {catName && (
                      <Dropdown
                        value={ex.muscle_group || ''}
                        onChange={mg => updateMuscleGroup(ex.id, mg)}
                        placeholder="— specific muscle —"
                        options={[
                          { value: '', label: '— specific muscle —' },
                          ...detailOptions.map(mg => ({ value: mg, label: mg }))
                        ]}
                        style={{ fontSize: '0.8rem' }}
                      />
                    )}
                  </div>
                )
              })}

              {/* Add exercise */}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border)' }}>
                <input
                  placeholder="Add exercise..."
                  value={newNames[type.id] || ''}
                  onChange={e => setNewNames(prev => ({ ...prev, [type.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addExercise(type.id)}
                  style={{ flex: 1 }}
                />
                <button onClick={() => addExercise(type.id)} style={btn({ background: accentColor, color: 'white', flexShrink: 0 })}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Analytics({ onWeekClick }) {
  const [tab, setTab] = useState('fitness')
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[{ key: 'fitness', label: 'Fitness' }, { key: 'nutrition', label: 'Nutrition' }, { key: 'health', label: 'Health' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={btn({
              background: tab === key ? 'var(--orange)' : 'var(--surface)',
              color: tab === key ? 'white' : 'var(--text-muted)',
              border: `1px solid ${tab === key ? 'var(--orange)' : 'var(--border)'}`,
              padding: '0.45rem 1.1rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
            })}
          >{label}</button>
        ))}
      </div>
      {tab === 'fitness' && <FitnessAnalytics onWeekClick={onWeekClick} />}
      {tab === 'nutrition' && <NutritionAnalytics />}
      {tab === 'health' && <HealthAnalytics />}
    </div>
  )
}

function FitnessAnalytics({ onWeekClick }) {
  const [range, setRange] = useState(8)
  const [rawVolume, setRawVolume] = useState([])
  const [freqData, setFreqData] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [progExId, setProgExId] = useState('')
  const [progData, setProgData] = useState([])
  const [volumeTooltip, setVolumeTooltip] = useState(null)
  const [monthRange, setMonthRange] = useState(6)
  const [summary, setSummary] = useState(null)
  const [volumeView, setVolumeView] = useState('category')

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

  useEffect(() => {
    axios.get(`${API}/analytics/summary`, { params: { months: monthRange } }).then(r => setSummary(r.data))
  }, [monthRange])

  // Pivot volume rows → { week, MuscleA: vol, MuscleB: vol, ... }
  const muscleKeys = [...new Set(rawVolume.map(r => r.muscle_group))].sort()
  const colorMap = Object.fromEntries(muscleKeys.map((m, i) => [m, CHART_COLORS[i % CHART_COLORS.length]]))
  const volumeChartData = (() => {
    const weeks = [...new Set(rawVolume.map(r => r.week))].sort()
    return weeks.map(w => {
      const obj = { week: fmtShortDate(w), weekRaw: w }
      muscleKeys.forEach(m => {
        const row = rawVolume.find(r => r.week === w && r.muscle_group === m)
        obj[m] = row ? row.volume : 0
      })
      return obj
    })
  })()

  // Category-level pivot — map each detailed muscle_group to its parent category
  const muscleGroupToCategory = Object.fromEntries(
    Object.entries(MUSCLE_GROUP_CATEGORIES).flatMap(([cat, muscles]) => muscles.map(m => [m, cat]))
  )
  const catVolumeChartData = (() => {
    const weeks = [...new Set(rawVolume.map(r => r.week))].sort()
    return weeks.map(w => {
      const obj = { week: fmtShortDate(w), weekRaw: w }
      Object.keys(CATEGORY_COLORS).forEach(cat => {
        obj[cat] = rawVolume
          .filter(r => r.week === w && muscleGroupToCategory[r.muscle_group] === cat)
          .reduce((sum, r) => sum + r.volume, 0)
      })
      return obj
    })
  })()
  const activeCatKeys = Object.keys(CATEGORY_COLORS).filter(cat =>
    catVolumeChartData.some(d => (d[cat] || 0) > 0)
  )

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
        {/* Header row with toggle */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
          <span style={{ ...secLabel, marginBottom: 0, flex: 1 }}>VOLUME BY MUSCLE GROUP <span style={{ opacity: 0.55, fontWeight: 400 }}>(total reps / week)</span></span>
          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
            {[{ key: 'category', label: 'Overview' }, { key: 'detail', label: 'Detailed' }].map(({ key, label }) => (
              <button key={key} onClick={() => { setVolumeView(key); setVolumeTooltip(null) }}
                style={{
                  padding: '0.2rem 0.55rem', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
                  background: volumeView === key ? 'var(--orange)' : 'var(--surface-hover)',
                  color: volumeView === key ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${volumeView === key ? 'var(--orange)' : 'var(--border)'}`,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {(volumeView === 'category' ? activeCatKeys.length === 0 : muscleKeys.length === 0) ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0', fontFamily: 'JetBrains Mono, monospace' }}>
            No data — assign muscle groups in Exercise Config first
          </div>
        ) : volumeView === 'category' ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={catVolumeChartData}
                barCategoryGap="30%"
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                style={{ cursor: 'pointer' }}
                onMouseMove={s => { if (s.activePayload?.length) setVolumeTooltip({ label: s.activeLabel, payload: s.activePayload }) }}
                onMouseLeave={() => setVolumeTooltip(null)}
                onClick={data => {
                  const weekRaw = data?.activePayload?.[0]?.payload?.weekRaw
                  if (!weekRaw || !onWeekClick) return
                  const end = new Date(weekRaw + 'T12:00:00')
                  end.setDate(end.getDate() + 6)
                  onWeekClick({ from: weekRaw, to: toLocalDateStr(end) })
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={() => null} wrapperStyle={{ display: 'none' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {activeCatKeys.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} radius={i === activeCatKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ minHeight: '54px', margin: '0.5rem 0 0.25rem' }}>
              {volumeTooltip ? (
                <div style={{ ...tooltipStyle, padding: '0.55rem 0.85rem' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.78rem', marginBottom: '0.35rem' }}>{volumeTooltip.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 1rem' }}>
                    {volumeTooltip.payload?.filter(p => p.value > 0).map(p => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.73rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--border)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', paddingTop: '1rem' }}>
                  hover a column to see breakdown
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              {activeCatKeys.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                  {cat}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={volumeChartData}
                barCategoryGap="30%"
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                style={{ cursor: 'pointer' }}
                onMouseMove={s => { if (s.activePayload?.length) setVolumeTooltip({ label: s.activeLabel, payload: s.activePayload }) }}
                onMouseLeave={() => setVolumeTooltip(null)}
                onClick={data => {
                  const weekRaw = data?.activePayload?.[0]?.payload?.weekRaw
                  if (!weekRaw || !onWeekClick) return
                  const end = new Date(weekRaw + 'T12:00:00')
                  end.setDate(end.getDate() + 6)
                  onWeekClick({ from: weekRaw, to: toLocalDateStr(end) })
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={() => null} wrapperStyle={{ display: 'none' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {muscleKeys.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={colorMap[m]} radius={i === muscleKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ minHeight: '54px', margin: '0.5rem 0 0.25rem' }}>
              {volumeTooltip ? (
                <div style={{ ...tooltipStyle, padding: '0.55rem 0.85rem' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.78rem', marginBottom: '0.35rem' }}>{volumeTooltip.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 1rem' }}>
                    {volumeTooltip.payload?.filter(p => p.value > 0).map(p => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.73rem', fontFamily: 'JetBrains Mono, monospace' }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{p.name.split(' (')[0]}:</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--border)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', paddingTop: '1rem' }}>
                  hover a column to see breakdown
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
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

      {/* Workout summary */}
      {summary && (() => {
        const monthlyFilled = (() => {
          const result = []
          const now = new Date()
          for (let i = monthRange - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const found = summary.monthly.find(m => m.month === key)
            result.push({ month: key, count: found ? found.count : 0 })
          }
          return result
        })()
        const fmtMonth = key => {
          const [y, mo] = key.split('-')
          return new Date(+y, +mo - 1).toLocaleString('en', { month: 'short' })
        }
        const fmtMonthLong = key => {
          const [y, mo] = key.split('-')
          return new Date(+y, +mo - 1).toLocaleString('en', { month: 'long', year: 'numeric' })
        }
        return (
          <div style={secCard}>
            <div style={secLabel}>WORKOUT SUMMARY</div>

            {/* This week / this month stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'THIS WEEK', curr: summary.this_week, prev: summary.last_week, prevLabel: 'last week' },
                { label: 'THIS MONTH', curr: summary.this_month, prev: summary.last_month, prevLabel: 'last month' },
              ].map(({ label, curr, prev, prevLabel }) => {
                const diff = curr - prev
                const trendColor = diff > 0 ? 'var(--green-text)' : diff < 0 ? '#e05555' : 'var(--text-muted)'
                const trendText = diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : '→ same'
                return (
                  <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{curr}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: trendColor, fontWeight: 600 }}>{trendText}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>vs {prevLabel} ({prev})</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Monthly history */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>MONTHLY HISTORY</div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[3, 6, 12].map(m => (
                  <button key={m} onClick={() => setMonthRange(m)} style={btn({
                    background: monthRange === m ? 'var(--orange)' : 'var(--surface)',
                    color: monthRange === m ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${monthRange === m ? 'var(--orange)' : 'var(--border)'}`,
                    padding: '0.2rem 0.55rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.7rem',
                  })}>{m}m</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthlyFilled} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={fmtMonth} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.25rem' }}
                  formatter={v => [v, 'workouts']}
                  labelFormatter={fmtMonthLong}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" fill="var(--orange)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

      {/* Training frequency calendar */}
      <div style={secCard}>
        <div style={secLabel}>TRAINING FREQUENCY</div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {[
            [WORKOUT_TYPE_COLORS['Push'], 'Push'],
            [WORKOUT_TYPE_COLORS['Pull'], 'Pull'],
            [WORKOUT_TYPE_COLORS['Legs'], 'Legs'],
            [CAMINHADA_COLOR, 'Caminhada'],
            ['var(--surface-hover)', 'Rest'],
          ].map(([color, label]) => (
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
                        background: future ? 'transparent' : isGym ? (WORKOUT_TYPE_COLORS[day.workout.workout_type_name] || 'var(--orange)') : isWalk ? CAMINHADA_COLOR : 'var(--surface-hover)',
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
        <Dropdown
          value={progExId}
          onChange={setProgExId}
          placeholder="Select an exercise..."
          options={(() => {
            const byCategory = {}
            const uncategorized = []
            allExercises.forEach(e => {
              const cat = e.muscle_group_category_name
              if (cat && CATEGORY_COLORS[cat]) {
                if (!byCategory[cat]) byCategory[cat] = []
                byCategory[cat].push(e)
              } else uncategorized.push(e)
            })
            const opts = [{ value: '', label: 'Select an exercise...' }]
            Object.keys(CATEGORY_COLORS).forEach(cat => {
              if (byCategory[cat]?.length) {
                opts.push({ isGroup: true, label: cat, color: CATEGORY_COLORS[cat] })
                byCategory[cat].forEach(e => opts.push({ value: String(e.id), label: e.name, dot: CATEGORY_COLORS[cat] }))
              }
            })
            if (uncategorized.length) {
              opts.push({ isGroup: true, label: 'Other', color: '#8a8a8a' })
              uncategorized.forEach(e => opts.push({ value: String(e.id), label: e.name }))
            }
            return opts
          })()}
          style={{ marginBottom: '1rem' }}
        />
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

const stripMealTime = (raw) => raw.replace(/^\s*\d{1,2}:\d{2}\s*,?\s*/, '')

function MealForm({ initial, onSave, onCancel, saveLabel = 'Save' }) {
  const [f, setF] = useState(initial)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const numField = (label, key) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</label>
      <input type="number" step="0.01" value={f[key] ?? ''} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'var(--text)', fontSize: '0.82rem' }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>MEAL</label>
        <input type="text" value={f.description} onChange={e => set('description', e.target.value)}
          style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'var(--text)', fontSize: '0.82rem' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {numField('CALORIES (kcal)', 'calories')}
        {numField('PROTEIN (g)', 'protein_g')}
        {numField('CARBS (g)', 'carbs_g')}
        {numField('FAT (g)', 'fat_g')}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button onClick={onCancel} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.8rem', padding: '0.35rem 0.85rem' })}>Cancel</button>
        <button onClick={() => onSave(f)} disabled={!f.description.trim()}
          style={btn({ background: 'var(--orange)', color: 'white', fontSize: '0.8rem', padding: '0.35rem 0.85rem', opacity: f.description.trim() ? 1 : 0.4 })}>{saveLabel}</button>
      </div>
    </div>
  )
}

function NutritionAnalytics() {
  const [meals, setMeals] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => axios.get(`${API}/nutrition/meals`, { params: { days: 7 } }).then(r => setMeals(r.data))
  useEffect(() => { load() }, [])

  const saveEdit = async (id, f) => {
    setSaving(true)
    await axios.patch(`${API}/nutrition/meals/${id}`, {
      raw_message: f.description,
      total_calories: f.calories !== '' ? +f.calories : null,
      total_protein_g: f.protein_g !== '' ? +f.protein_g : null,
      total_carbs_g: f.carbs_g !== '' ? +f.carbs_g : null,
      total_fat_g: f.fat_g !== '' ? +f.fat_g : null,
    })
    setSaving(false)
    setEditingId(null)
    load()
  }

  const deleteMeal = async (id) => {
    if (!window.confirm('Delete this meal?')) return
    await axios.delete(`${API}/nutrition/meals/${id}`)
    load()
  }

  const todayStr = toLocalDateStr(new Date())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return toLocalDateStr(d)
  })

  const fmtDayHeader = (ds) => {
    const [y, m, d] = ds.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const mealsByDay = (ds) => meals
    .filter(meal => meal.eaten_at?.slice(0, 10) === ds)
    .sort((a, b) => a.eaten_at.localeCompare(b.eaten_at))

  const dayTotals = (dayMeals) => dayMeals.reduce((acc, m) => ({
    calories: acc.calories + (m.total_calories ?? 0),
    protein_g: acc.protein_g + (m.total_protein_g ?? 0),
    carbs_g: acc.carbs_g + (m.total_carbs_g ?? 0),
    fat_g: acc.fat_g + (m.total_fat_g ?? 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {days.map(ds => {
        const dayMeals = mealsByDay(ds)
        const totals = dayTotals(dayMeals)
        return (
          <div key={ds} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>{fmtDayHeader(ds)}</div>
              {ds === todayStr && (
                <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(224,123,84,0.15)', color: 'var(--orange)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>TODAY</span>
              )}
              {dayMeals.length > 0 && (
                <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{Math.round(totals.calories)} kcal</span>
                  {' · '}{totals.protein_g.toFixed(1)}p · {totals.carbs_g.toFixed(1)}c · {totals.fat_g.toFixed(1)}f
                </div>
              )}
            </div>
            {dayMeals.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--border)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '0.75rem 0' }}>
                No meals logged
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {dayMeals.map(meal => (
                  <div key={meal.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                    {editingId === meal.id ? (
                      <MealForm
                        initial={{
                          description: stripMealTime(meal.raw_message),
                          calories: meal.total_calories ?? '',
                          protein_g: meal.total_protein_g ?? '',
                          carbs_g: meal.total_carbs_g ?? '',
                          fat_g: meal.total_fat_g ?? '',
                        }}
                        onSave={f => saveEdit(meal.id, f)}
                        onCancel={() => setEditingId(null)}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '38px', paddingTop: '0.1rem' }}>
                          {meal.eaten_at?.slice(11, 16)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{stripMealTime(meal.raw_message)}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '0.2rem' }}>
                            {meal.total_calories != null ? `${meal.total_calories} kcal` : '— kcal'}
                            {meal.total_protein_g != null && ` · ${meal.total_protein_g}p`}
                            {meal.total_carbs_g != null && ` · ${meal.total_carbs_g}c`}
                            {meal.total_fat_g != null && ` · ${meal.total_fat_g}f`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                          <button onClick={() => setEditingId(meal.id)}
                            style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.7rem', padding: '0.25rem 0.55rem' })}>
                            Edit
                          </button>
                          <button onClick={() => deleteMeal(meal.id)}
                            style={btn({ background: 'var(--surface-hover)', color: '#e05555', border: '1px solid var(--border)', fontSize: '0.7rem', padding: '0.25rem 0.55rem' })}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const SOURCES = ['manual', 'llm_estimate', 'usda', 'openfoodfacts', 'other']

const emptyFood = () => ({ food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', serving_description: '1 porção', serving_g: '100', source: 'manual' })

function FoodForm({ initial, onSave, onCancel, saveLabel = 'Save' }) {
  const [f, setF] = useState(initial)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const numField = (label, key) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</label>
      <input type="number" step="0.01" value={f[key] ?? ''} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'var(--text)', fontSize: '0.82rem' }} />
    </div>
  )
  const txtField = (label, key) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</label>
      <input type="text" value={f[key] ?? ''} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'var(--text)', fontSize: '0.82rem' }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
      {txtField('FOOD NAME', 'food_name')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {numField('CALORIES (kcal)', 'calories')}
        {numField('PROTEIN (g)', 'protein_g')}
        {numField('CARBS (g)', 'carbs_g')}
        {numField('FAT (g)', 'fat_g')}
        {numField('SERVING (g)', 'serving_g')}
        {txtField('SERVING DESC', 'serving_description')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>SOURCE</label>
        <Dropdown value={f.source ?? 'manual'} onChange={v => set('source', v)} options={SOURCES.map(s => ({ value: s, label: s }))} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button onClick={onCancel} style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.8rem', padding: '0.35rem 0.85rem' })}>Cancel</button>
        <button onClick={() => onSave(f)} disabled={!f.food_name.trim()}
          style={btn({ background: 'var(--orange)', color: 'white', fontSize: '0.8rem', padding: '0.35rem 0.85rem', opacity: f.food_name.trim() ? 1 : 0.4 })}>{saveLabel}</button>
      </div>
    </div>
  )
}

function NutritionPage() {
  const [foods, setFoods] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => axios.get(`${API}/nutrition/foods`).then(r => setFoods(r.data))
  useEffect(() => { load() }, [])

  const saveEdit = async (id, f) => {
    setSaving(true)
    await axios.patch(`${API}/nutrition/foods/${id}`, {
      food_name: f.food_name, calories: f.calories ? +f.calories : null,
      protein_g: f.protein_g ? +f.protein_g : null, carbs_g: f.carbs_g ? +f.carbs_g : null,
      fat_g: f.fat_g ? +f.fat_g : null, serving_description: f.serving_description,
      serving_g: f.serving_g ? +f.serving_g : null, source: f.source,
    })
    setSaving(false)
    setEditingId(null)
    load()
  }

  const saveNew = async (f) => {
    setSaving(true)
    await axios.post(`${API}/nutrition/foods`, {
      food_name: f.food_name, calories: f.calories ? +f.calories : null,
      protein_g: f.protein_g ? +f.protein_g : null, carbs_g: f.carbs_g ? +f.carbs_g : null,
      fat_g: f.fat_g ? +f.fat_g : null, serving_description: f.serving_description,
      serving_g: f.serving_g ? +f.serving_g : null, source: f.source,
    })
    setSaving(false)
    setAdding(false)
    load()
  }

  const macroChip = (label, val, color) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{val != null ? Number(val).toFixed(1) : '—'}</span>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
    </div>
  )

  const filtered = foods.filter(f => f.food_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>NUTRITION</div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="text" placeholder="Search foods..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem' }} />
        {!adding && (
          <button onClick={() => { setAdding(true); setEditingId(null) }}
            style={btn({ background: 'var(--orange)', color: 'white', fontSize: '0.8rem', padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' })}>
            <Plus size={14} /> Add Food
          </button>
        )}
      </div>

      {adding && (
        <div style={card}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--orange)', letterSpacing: '0.08em' }}>NEW FOOD</div>
          <FoodForm initial={emptyFood()} onSave={saveNew} onCancel={() => setAdding(false)} saveLabel={saving ? 'Saving...' : 'Save'} />
        </div>
      )}

      {filtered.map(food => (
        <div key={food.id} style={card}>
          {editingId === food.id ? (
            <>
              <div style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--orange)', letterSpacing: '0.08em' }}>EDITING</div>
              <FoodForm
                initial={{ ...food, calories: food.calories ?? '', protein_g: food.protein_g ?? '', carbs_g: food.carbs_g ?? '', fat_g: food.fat_g ?? '', serving_g: food.serving_g ?? '' }}
                onSave={f => saveEdit(food.id, f)}
                onCancel={() => setEditingId(null)}
                saveLabel={saving ? 'Saving...' : 'Save'}
              />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.92rem', marginBottom: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {food.food_name}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {macroChip('kcal', food.calories, 'var(--orange)')}
                  {macroChip('prot', food.protein_g, '#4a9e7a')}
                  {macroChip('carbs', food.carbs_g, '#6a8fd4')}
                  {macroChip('fat', food.fat_g, '#d4b45a')}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                    {food.serving_g}g · {food.serving_description}
                  </div>
                </div>
                <div style={{ marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace', background: 'var(--surface-hover)', color: 'var(--text-muted)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    {food.source}
                  </span>
                </div>
              </div>
              <button onClick={() => { setEditingId(food.id); setAdding(false) }}
                style={btn({ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '0.3rem 0.65rem' })}>
                Edit
              </button>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && !adding && (
        <div style={{ textAlign: 'center', color: 'var(--border)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', paddingTop: '2rem' }}>
          {search ? 'No foods match your search' : 'No foods in knowledge base yet'}
        </div>
      )}
    </div>
  )
}
// ---- Health Analytics ----

function fmt_dur(s) {
  if (!s) return '--'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function SleepBar({ stages }) {
  if (!stages) return <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>--</span>
  const order = ['LIGHT', 'DEEP', 'REM', 'WAKE', 'AWAKE', 'ASLEEP', 'light', 'deep', 'rem', 'wake', 'awake', 'asleep']
  const colors = { DEEP: '#3b5bdb', deep: '#3b5bdb', REM: '#7950f2', rem: '#7950f2', LIGHT: '#74c0fc', light: '#74c0fc', WAKE: '#e03131', wake: '#e03131', AWAKE: '#e03131', awake: '#e03131', ASLEEP: '#74c0fc', asleep: '#74c0fc' }
  const total = Object.values(stages).reduce((a, b) => a + b, 0)
  if (!total) return <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>--</span>
  return (
    <div style={{ display: 'flex', height: '10px', borderRadius: '3px', overflow: 'hidden', width: '80px', gap: '1px' }}>
      {order.filter(k => stages[k]).map(k => (
        <div key={k} title={`${k}: ${stages[k]}m`}
          style={{ background: colors[k] || '#888', flexBasis: `${(stages[k] / total) * 100}%`, flexShrink: 0 }} />
      ))}
    </div>
  )
}

function ChartNav({ label, onPrev, onNext, disableNext }) {
  const navBtn = (onClick, disabled, ch) => (
    <button onClick={e => { e.stopPropagation(); onClick() }} disabled={disabled} style={{
      background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
      color: disabled ? 'var(--border)' : 'var(--text-muted)', fontSize: '1.1rem',
      padding: '0 0.4rem', lineHeight: 1,
    }}>{ch}</button>
  )
  return (
    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      {navBtn(onPrev, false, '‹')}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
      {navBtn(onNext, disableNext, '›')}
    </div>
  )
}

function HRDayChart({ zones }) {
  const [offset, setOffset] = useState(0) // 0=today, -1=yesterday
  const [hrData, setHrData] = useState(null)

  const selectedDate = () => {
    const d = new Date(); d.setDate(d.getDate() + offset); return d
  }

  useEffect(() => {
    setHrData(null)
    const d = selectedDate()
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    axios.get(`${API}/health/hr_during`, { params: { start: start.toISOString(), end: end.toISOString() } })
      .then(r => setHrData(r.data))
      .catch(() => setHrData({ points: [], zones: zones || {} }))
  }, [offset])

  const d = selectedDate()
  const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

  const data = hrData || {}
  const points = data.points || []
  const zoneMap = data.zones || zones || {}

  const renderChart = () => {
    if (!hrData) return <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>
    if (points.length < 2) return <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>No HR data</div>

    const W = 600, CHART_H = 64, LABEL_H = 14, H = CHART_H + LABEL_H
    const bpms = points.map(p => p.bpm)
    const minB = Math.min(...bpms), maxB = Math.max(...bpms)
    const avgB = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
    const range = maxB - minB || 1
    const t0 = new Date(points[0].t).getTime()
    const tEnd = new Date(points[points.length - 1].t).getTime()
    const tR = tEnd - t0 || 1
    const px = t => ((new Date(t).getTime() - t0) / tR) * W
    const py = b => 4 + (CHART_H - 8) - ((b - minB) / range) * (CHART_H - 8)

    // 1-hour tick marks
    const hourMarks = []
    const cursor = new Date(t0)
    cursor.setMinutes(0, 0, 0)
    cursor.setHours(cursor.getHours() + 1)
    while (cursor.getTime() <= tEnd) {
      hourMarks.push(new Date(cursor))
      cursor.setHours(cursor.getHours() + 1)
    }

    const segs = []
    let cur = null
    for (const p of points) {
      const z = zoneForBpm(p.bpm, zoneMap)
      if (!cur || cur.zone !== z) { if (cur) segs.push(cur); cur = { zone: z, pts: [] } }
      cur.pts.push(p)
    }
    if (cur) segs.push(cur)

    return (
      <div>
        <div style={{ display: 'flex', gap: '1rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', marginBottom: '0.35rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>avg <b style={{ color: 'var(--text)' }}>{avgB}</b></span>
          <span style={{ color: 'var(--text-muted)' }}>min <b style={{ color: ZONE_COLORS.LIGHT }}>{minB}</b></span>
          <span style={{ color: 'var(--text-muted)' }}>max <b style={{ color: ZONE_COLORS.PEAK }}>{maxB}</b></span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px`, display: 'block' }}>
          {/* hour grid lines + labels */}
          {hourMarks.map((h, i) => {
            const x = px(h.getTime())
            const hh = h.getHours()
            const label = `${hh}h`
            return (
              <g key={i}>
                <line x1={x.toFixed(1)} y1={0} x2={x.toFixed(1)} y2={CHART_H} stroke="rgba(128,128,128,0.12)" strokeWidth="0.8" />
                <text x={x.toFixed(1)} y={H - 2} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.4} fontFamily="JetBrains Mono, monospace">{label}</text>
              </g>
            )
          })}
          {segs.map((s, i) => {
            const lp = s.pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${px(p.t).toFixed(1)},${py(p.bpm).toFixed(1)}`).join(' ')
            const fp = `${lp} L${px(s.pts[s.pts.length - 1].t).toFixed(1)},${CHART_H} L${px(s.pts[0].t).toFixed(1)},${CHART_H} Z`
            return <g key={i}><path d={fp} fill={ZONE_COLORS[s.zone]} opacity="0.15" /><path d={lp} fill="none" stroke={ZONE_COLORS[s.zone]} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></g>
          })}
          <line x1="0" y1={py(avgB).toFixed(1)} x2={W} y2={py(avgB).toFixed(1)} stroke="rgba(128,128,128,0.35)" strokeWidth="0.8" strokeDasharray="4 3" />
        </svg>
      </div>
    )
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: '0.75rem' }}>
      <ChartNav label={dateLabel} onPrev={() => setOffset(o => o - 1)} onNext={() => setOffset(o => o + 1)} disableNext={offset >= 0} />
      {renderChart()}
    </div>
  )
}

function WeeklyBarChart({ valueKey, color, format, minFloor }) {
  const [weekOffset, setWeekOffset] = useState(0) // 0=this week, -1=last week
  const [days, setDays] = useState(null)

  useEffect(() => {
    const end = new Date()
    end.setDate(end.getDate() + weekOffset * 7)
    const endStr = end.toISOString().split('T')[0]
    axios.get(`${API}/health/days`, { params: { days: 7, end_date: endStr } })
      .then(r => setDays(r.data))
      .catch(() => setDays([]))
  }, [weekOffset])

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + weekOffset * 7)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)
  const rangeLabel = `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  const renderChart = () => {
    if (!days) return <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>

    const W = 280, BAR_H = 56, LABEL_H = 14, H = BAR_H + LABEL_H
    const vals = days.map(d => d[valueKey]).filter(v => v != null)
    if (!vals.length) return <div style={{ height: `${H}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>No data</div>

    const maxV = Math.max(...vals)
    const minV = minFloor != null ? Math.min(minFloor, Math.min(...vals)) : 0
    const range = maxV - minV || 1
    const slotW = W / 7
    const barW = slotW * 0.55

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H + 4}px`, display: 'block', overflow: 'visible' }}>
        {[...days].reverse().map((day, i) => {
          const val = day[valueKey]
          const barH = val != null ? ((val - minV) / range) * BAR_H : 0
          const x = i * slotW + (slotW - barW) / 2
          const dow = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })
          return (
            <g key={day.date}>
              {val != null && (
                <rect x={x} y={BAR_H - barH} width={barW} height={barH} fill={color} opacity={0.8} rx={2} />
              )}
              <text x={x + barW / 2} y={H - 1} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45} fontFamily="JetBrains Mono, monospace">{dow}</text>
              {val != null && barH > 10 && (
                <text x={x + barW / 2} y={BAR_H - barH - 3} textAnchor="middle" fontSize={8} fill={color} opacity={0.9} fontFamily="JetBrains Mono, monospace">{format(val)}</text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: '0.75rem' }}>
      <ChartNav label={rangeLabel} onPrev={() => setWeekOffset(o => o - 1)} onNext={() => setWeekOffset(o => o + 1)} disableNext={weekOffset >= 0} />
      {renderChart()}
    </div>
  )
}

function ExpandableMetricCard({ icon, colorIcon, label, value, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '0.7rem 0.9rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{label}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        </div>
        <span style={{ fontSize: '1.25rem', filter: colorIcon ? 'none' : 'grayscale(1) brightness(0.55)', lineHeight: 1 }}>{icon}</span>
      </div>
      {children}
    </div>
  )
}

function MetricCards({ current }) {
  const hr = current?.heart_rate
  const spo2 = current?.spo2
  const hrv = current?.hrv
  const zones = {} // zones fetched inside HRDayChart via hr_during

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '1.5rem' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <ExpandableMetricCard icon="❤️" colorIcon label="Heart Rate" value={hr ? `${hr.bpm} bpm` : '--'}>
          <HRDayChart zones={zones} />
        </ExpandableMetricCard>
      </div>
      <ExpandableMetricCard icon="💧" label="SpO₂" value={spo2 ? `${Number(spo2.percentage).toFixed(1)}%` : '--'}>
        <WeeklyBarChart valueKey="spo2_avg" color="#4fc3f7" format={v => `${v.toFixed(1)}%`} minFloor={90} />
      </ExpandableMetricCard>
      <ExpandableMetricCard icon="〰️" label="HRV" value={hrv ? `${Math.round(hrv.rmssd_ms)} ms` : '--'}>
        <WeeklyBarChart valueKey="hrv_avg_ms" color="#a9e34b" format={v => `${Math.round(v)}`} />
      </ExpandableMetricCard>
      <ExpandableMetricCard icon="👣" label="Steps" value={current?.today_steps != null ? current.today_steps.toLocaleString() : '--'}>
        <WeeklyBarChart valueKey="steps" color="#ffa94d" format={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`} />
      </ExpandableMetricCard>
      <ExpandableMetricCard icon="📍" label="Distance" value={current?.today_distance_m != null ? `${(current.today_distance_m / 1000).toFixed(2)} km` : '--'}>
        <WeeklyBarChart valueKey="distance_m" color="#69db7c" format={v => `${(v/1000).toFixed(1)}`} />
      </ExpandableMetricCard>
    </div>
  )
}

function DayRow({ day }) {
  const [open, setOpen] = useState(false)
  const d = new Date(day.date + 'T12:00:00')
  const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const sl = day.sleep
  const sleepStr = sl ? `${Math.round((sl.minutes_asleep || 0) / 60 * 10) / 10}h` : '--'

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'grid',
        gridTemplateColumns: '100px 62px 52px 50px 62px 4px 62px 80px 54px 52px',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.6rem 0.25rem',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text)',
        userSelect: 'none',
      }}>
        {/* Left group */}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{day.resting_hr ? `${day.resting_hr} bpm` : '--'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{day.hrv_avg_ms ? `${Math.round(day.hrv_avg_ms)}ms` : '--'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{day.spo2_avg ? `${Number(day.spo2_avg).toFixed(1)}%` : '--'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{day.steps ? day.steps.toLocaleString() : '--'}</span>
        {/* Separator */}
        <span style={{ borderLeft: '1px solid var(--border)', height: '1.4em', display: 'block' }} />
        {/* Sleep group */}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{sleepStr}</span>
        <SleepBar stages={sl?.stages} />
        <span style={{ color: day.sleep_temp_nightly != null ? (day.sleep_temp_nightly > 0 ? '#e03131' : '#74c0fc') : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {day.sleep_temp_nightly != null ? `${day.sleep_temp_nightly > 0 ? '+' : ''}${Number(day.sleep_temp_nightly).toFixed(2)}°` : '--'}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{day.respiratory_rate ? `${Number(day.respiratory_rate).toFixed(1)}` : '--'}</span>
      </div>
      {open && sl && (
        <div style={{
          padding: '0.75rem 1rem 1rem',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          fontSize: '0.75rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-muted)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <span>Asleep: {fmt_dur((sl.minutes_asleep || 0) * 60)}</span>
          <span>Awake: {fmt_dur((sl.minutes_awake || 0) * 60)}</span>
          {sl.stages && Object.entries(sl.stages).map(([k, v]) => (
            <span key={k}>{k.charAt(0) + k.slice(1).toLowerCase()}: {fmt_dur(v * 60)}</span>
          ))}
          {day.hrv_deep_rmssd_ms && <span>Deep HRV: {Math.round(day.hrv_deep_rmssd_ms)}ms</span>}
          {day.spo2_lower && <span>SpO₂ low: {Number(day.spo2_lower).toFixed(1)}%</span>}
          {day.distance_m && <span>Distance: {(day.distance_m / 1000).toFixed(2)} km</span>}
        </div>
      )}
    </div>
  )
}

function HealthAnalytics() {
  const [current, setCurrent] = useState(null)
  const [days, setDays] = useState([])
  const [dayCount, setDayCount] = useState(14)
  const [loading, setLoading] = useState(true)

  const loadCurrent = () => axios.get(`${API}/health/current`).then(r => setCurrent(r.data)).catch(() => {})
  const loadDays = (n) => axios.get(`${API}/health/days?days=${n}`).then(r => setDays(r.data)).catch(() => {})

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCurrent(), loadDays(dayCount)]).finally(() => setLoading(false))
    const interval = setInterval(loadCurrent, 60_000)
    return () => clearInterval(interval)
  }, [dayCount])

  const hdrCell = (label) => (
    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
  )

  return (
    <div>
      <MetricCards current={current} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily metrics</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[7, 14, 30].map(n => (
            <button key={n} onClick={() => setDayCount(n)} style={btn({
              padding: '0.25rem 0.6rem', fontSize: '0.7rem',
              background: dayCount === n ? 'var(--orange)' : 'var(--surface)',
              color: dayCount === n ? 'white' : 'var(--text-muted)',
              border: `1px solid ${dayCount === n ? 'var(--orange)' : 'var(--border)'}`,
              fontFamily: 'JetBrains Mono, monospace',
            })}>{n}d</button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* Group header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 62px 52px 50px 62px 4px 62px 80px 54px 52px',
          gap: '0.4rem',
          padding: '0.2rem 0.25rem 0',
        }}>
          <span /><span /><span /><span /><span /><span />
          <span style={{
            gridColumn: 'span 4',
            fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.08em',
            borderLeft: '2px solid var(--orange)', paddingLeft: '0.4rem',
          }}>Sleep</span>
        </div>
        {/* Column header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 62px 52px 50px 62px 4px 62px 80px 54px 52px',
          gap: '0.4rem',
          padding: '0.15rem 0.25rem 0.4rem',
          borderBottom: '2px solid var(--border)',
        }}>
          {hdrCell('Date')}
          {hdrCell('Resting HR')}
          {hdrCell('HRV')}
          {hdrCell('SpO₂')}
          {hdrCell('Steps')}
          <span />
          {hdrCell('Duration')}
          {hdrCell('Stages')}
          {hdrCell('Skin Δ')}
          {hdrCell('Resp')}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>Loading…</div>
        ) : days.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>No data available</div>
        ) : (
          days.map(day => <DayRow key={day.date} day={day} />)
        )}
      </div>
    </div>
  )
}
