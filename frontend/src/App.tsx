import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdherenceChart from './components/AdherenceChart'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { HomeIcon, PlusIcon, ClockIcon, BoxIcon, PillIcon, EditIcon, TrashIcon, WarningIcon, SunIcon, MoonIcon } from './components/Icons'

type Medicine = {
  id: number
  name: string
  dose: string
  frequency: string
  remaining: number
  status: string
}

export default function App() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') ?? 'light')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      if (next === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', next)
    } catch (e) {
      // ignore storage errors
    }
  }

  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [schedule, setSchedule] = useState<Medicine[]>([])
  const [adherence, setAdherence] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [route, setRoute] = useState<string>(() => window.location.pathname || '/')

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || '/')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (p: string) => {
    if (window.location.pathname !== p) {
      window.history.pushState({}, '', p)
      setRoute(p)
    }
  }

  // API base - use Vite env if provided, otherwise default to backend port 8080
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8080'

  useEffect(() => {
    axios.get(`${API_BASE}/api/medicines`)
      .then(r => setMedicines(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMedicines([]))

    axios.get(`${API_BASE}/api/schedule/today`)
      .then(r => setSchedule(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSchedule([]))

    axios.get(`${API_BASE}/api/adherence`)
      .then(r => setAdherence(r.data ?? null))
      .catch(() => setAdherence(null))

    axios.get(`${API_BASE}/api/summary`)
      .then(r => setSummary(r.data ?? null))
      .catch(() => setSummary(null))
  }, [])

  // On mount, try to read persisted auth (this is just a placeholder; adapt to your backend/session)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) {}
  }, [])

  return (
    <div className="min-h-screen p-6">
        {route === '/login' && <Login isPage onClose={() => navigate('/')} onSuccess={(u) => { setUser(u); localStorage.setItem('auth', JSON.stringify(u)); navigate('/'); }} />}
        {route === '/signup' && <Signup isPage onClose={() => navigate('/')} onSuccess={(u) => { setUser(u); localStorage.setItem('auth', JSON.stringify(u)); navigate('/'); }} />}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">DR</div>
          <div>
            <h1 className="text-xl font-semibold">DoseRight</h1>
            <div className="text-xs text-slate-500">Medication manager</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="text-sm text-slate-600">{user.name ?? user.patientId}</div>
              <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center">{(user.name || 'U')[0]?.toUpperCase()}</div>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="text-sm text-slate-600 hover:text-slate-900 dark:hover:text-white px-2">Login</button>
              <button onClick={() => navigate('/signup')} className="text-sm text-slate-600 hover:text-slate-900 dark:hover:text-white px-2">Sign up</button>
            </>
          )}
          <button onClick={toggleTheme} aria-label="Toggle dark mode" className="ml-4 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400"/> : <MoonIcon className="w-5 h-5 text-slate-600"/>}
          </button>
          {user ? (
            <button onClick={() => { setUser(null); localStorage.removeItem('auth'); navigate('/') }} className="ml-2 text-sm text-slate-600 hover:text-red-600 border border-transparent hover:border-red-100 px-3 py-1 rounded">Logout</button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="grid grid-cols-4 gap-4">
            <div className="top-action flex flex-col items-center justify-center"> <HomeIcon className="w-6 h-6 text-slate-700"/> <div className="mt-2">Dashboard</div> </div>
            <div className="top-action flex flex-col items-center justify-center"> <PlusIcon className="w-6 h-6 text-slate-700"/> <div className="mt-2">Add Medicine</div> </div>
            <div className="top-action flex flex-col items-center justify-center"> <ClockIcon className="w-6 h-6 text-slate-700"/> <div className="mt-2">History</div> </div>
            <div className="top-action flex flex-col items-center justify-center"> <BoxIcon className="w-6 h-6 text-slate-700"/> <div className="mt-2">Refill</div> </div>
          </div>
        </div>

        <div className="col-span-8">
          <div className="card">
            <h2 className="font-semibold mb-2">Today's Schedule</h2>
            <p className="text-sm text-slate-500 mb-4">Your medicine schedule for today</p>
            <div className="space-y-3">
              {(Array.isArray(schedule) ? schedule : []).map((s: any) => (
                <div key={s.id} className="schedule-item">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-cyan-600 border border-cyan-100"><PillIcon className="w-5 h-5"/></div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-slate-500">{s.dose}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600"><ClockIcon className="w-4 h-4 inline-block mr-1 text-slate-500"/>{s.time ?? '—'}</div>
                    <div className="mt-2">
                      <span className={`small-pill ${s.status === 'Taken' ? 'status-taken' : s.status === 'Missed' ? 'status-missed' : 'status-upcoming'}`}>{s.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-6">
            <h2 className="font-semibold mb-2">Medicine Overview</h2>
            <p className="text-sm text-slate-500 mb-4">All your medicines</p>
            <div className="grid grid-cols-2 gap-4">
              {(Array.isArray(medicines) ? medicines : []).map((m: any) => (
                <div key={m.id} className="medicine-card border rounded-lg p-4 bg-white relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-slate-500">{m.dose} • {m.frequency}</div>
                      <div className="text-xs mt-2">
                        {m.remaining < 10 ? (
                          <div className="flex items-center text-red-700">
                            <WarningIcon className="w-4 h-4 inline-block mr-2" />
                            <span className="font-medium">{m.remaining} tablets remaining</span>
                          </div>
                        ) : (
                          <div className="text-slate-400">{m.remaining} tablets remaining</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded ${m.status === 'Taken' ? 'bg-green-100 text-green-700' : m.status === 'Missed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button title="Edit" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><EditIcon className="w-4 h-4 text-slate-600 dark:text-slate-300"/></button>
                    <button title="Delete" className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="col-span-4 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">Adherence</h3>
                <p className="text-sm text-slate-500">Your medication adherence rate</p>
              </div>
            </div>
            <div className="mt-4">
                {adherence ? <AdherenceChart taken={adherence.taken} missed={adherence.missed} /> : <div>Loading chart…</div>}
            </div>
            <div className="mt-4 space-y-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-green-50 p-3 rounded-md">
                  <div className="text-sm text-green-800">Doses Taken</div>
                  <div className="font-medium text-green-800">{summary?.dosesTaken ?? '—'}</div>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-3 rounded-md">
                  <div className="text-sm text-red-800">Doses Missed</div>
                  <div className="font-medium text-red-800">{summary?.dosesMissed ?? '—'}</div>
                </div>
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md">
                  <div className="text-sm text-blue-800">Adherence Rate</div>
                  <div className="font-medium text-blue-800">{adherence?.rate ?? '—'}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-600 text-white h-40">
            <div className="text-center">
              <div className="text-3xl font-bold">{summary?.activeMedicines ?? '—'}</div>
              <div className="mt-1">Active Medicines</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
