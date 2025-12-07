import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdherenceChart from './components/AdherenceChart'
import AuthPage from './pages/AuthPage'
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
  const [confirmAction, setConfirmAction] = useState<any>(null)

  // API base - use Vite env if provided, otherwise default to backend port 8080
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8080'

  const getAuthHeaders = () => {
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {}
  }

  const fetchDashboardData = () => {
    if (!user) return

    const headers = getAuthHeaders()
    
    axios.get(`${API_BASE}/api/dashboard/medicines`, { headers })
      .then(r => setMedicines(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMedicines([]))

    axios.get(`${API_BASE}/api/dashboard/schedule`, { headers })
      .then(r => setSchedule(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSchedule([]))

    axios.get(`${API_BASE}/api/dashboard/adherence`, { headers })
      .then(r => setAdherence(r.data ?? null))
      .catch(() => setAdherence(null))

    axios.get(`${API_BASE}/api/dashboard/summary`, { headers })
      .then(r => setSummary(r.data ?? null))
      .catch(() => setSummary(null))
  }

  const handleMarkDose = (doseId: string, dose: any, action: 'taken' | 'missed') => {
    // Show confirmation dialog with action type
    setConfirmAction({ doseId, dose, action })
  }

  const confirmAndMarkDose = async () => {
    if (!confirmAction) return
    
    try {
      const headers = getAuthHeaders()
      const endpoint = confirmAction.action === 'taken' 
        ? `${API_BASE}/api/dashboard/doses/${confirmAction.doseId}/mark-taken`
        : `${API_BASE}/api/dashboard/doses/${confirmAction.doseId}/mark-missed`
      
      await axios.patch(endpoint, {}, { headers })
      setConfirmAction(null)
      fetchDashboardData() // Refresh data
    } catch (error: any) {
      const actionText = confirmAction.action === 'taken' ? 'mark dose as taken' : 'mark dose as missed'
      alert(error?.response?.data?.message || `Failed to ${actionText}`)
      setConfirmAction(null)
    }
  }

  const handleRefill = async (medicationPlanId: string) => {
    const amount = prompt('Enter the number of tablets to add:')
    if (!amount || isNaN(Number(amount))) return

    try {
      const headers = getAuthHeaders()
      await axios.patch(`${API_BASE}/api/dashboard/medications/${medicationPlanId}/refill`, 
        { amount: Number(amount) }, 
        { headers }
      )
      fetchDashboardData() // Refresh data
      alert('Medication refilled successfully!')
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to refill medication')
    }
  }

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

  // Basic route guard: if user is not authenticated, redirect to /login for protected routes
  useEffect(() => {
    // if not logged in and not on auth pages, force to /login
    if (!user && route !== '/login' && route !== '/signup') {
      navigate('/login')
    }
  }, [route, user])

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  // On mount, try to read persisted auth and token
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth')
      const token = localStorage.getItem('token')
      if (raw && token) {
        const userData = JSON.parse(raw)
        // Combine stored user data with token
        setUser({ ...userData, token })
      }
    } catch (e) {}
  }, [])

  return (
    <div className="min-h-screen p-6">
      {(route === '/login' || route === '/signup') ? (
        <AuthPage 
          initialTab={route === '/signup' ? 'signup' : 'login'} 
          onClose={() => navigate('/')} 
          onSuccess={(u) => { 
            setUser(u); 
            localStorage.setItem('auth', JSON.stringify(u)); 
            navigate('/'); 
          }} 
        />
      ) : (
        <>
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
              {(Array.isArray(schedule) && schedule.length > 0) ? schedule.map((s: any) => {
                const med = s.medicationPlanId;
                const scheduledTime = new Date(s.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const statusDisplay = s.status === 'taken' ? 'Taken' : s.status === 'missed' ? 'Missed' : s.status === 'pending' ? 'Pending' : s.status.charAt(0).toUpperCase() + s.status.slice(1);
                
                return (
                  <div key={s._id} className="schedule-item">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-cyan-600 border border-cyan-100"><PillIcon className="w-5 h-5"/></div>
                      <div>
                        <div className="font-medium">{med?.medicationName || 'Unknown Medicine'}</div>
                        <div className="text-sm text-slate-500">{med?.medicationStrength || ''} {med?.medicationForm || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600"><ClockIcon className="w-4 h-4 inline-block mr-1 text-slate-500"/>{scheduledTime}</div>
                      <div className="mt-2 flex gap-2">
                        <button 
                          onClick={() => handleMarkDose(s._id, s, 'taken')}
                          disabled={s.status === 'taken' || s.status === 'missed'}
                          className={`small-pill ${s.status === 'taken' ? 'status-taken cursor-not-allowed' : s.status === 'missed' ? 'status-missed cursor-not-allowed' : 'status-upcoming hover:opacity-80'}`}
                        >
                          {statusDisplay}
                        </button>
                        <button
                          onClick={() => handleMarkDose(s._id, s, 'missed')}
                          disabled={s.status === 'taken' || s.status === 'missed'}
                          className="px-3 py-1 text-sm rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Miss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center text-slate-400 py-8">No doses scheduled for today</div>
              )}
            </div>
          </div>

          <div className="card mt-6">
            <h2 className="font-semibold mb-2">Medicine Overview</h2>
            <p className="text-sm text-slate-500 mb-4">All your medicines</p>
            <div className="grid grid-cols-2 gap-4">
              {(Array.isArray(medicines) && medicines.length > 0) ? medicines.map((m: any) => {
                const timesDisplay = m.times?.join(', ') || 'Not set';
                const remaining = m.stock?.remaining || 0;
                
                return (
                  <div key={m._id} className="medicine-card border rounded-lg p-4 bg-white dark:bg-slate-800 relative group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{m.medicationName}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{m.medicationStrength} {m.medicationForm} • {m.dosagePerIntake}x per dose</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Times: {timesDisplay}</div>
                        <div className="text-xs mt-2">
                          {remaining < 10 ? (
                            <div className="flex items-center text-red-700 dark:text-red-400">
                              <WarningIcon className="w-4 h-4 inline-block mr-1" />
                              <span className="font-medium">{remaining} remaining - Refill needed!</span>
                            </div>
                          ) : (
                            <div className="text-slate-400 dark:text-slate-500">{remaining} tablets remaining</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${m.active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {m.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    {remaining < 10 && (
                      <button 
                        onClick={() => handleRefill(m._id)}
                        className="mt-3 w-full py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
                      >
                        Request Refill
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-2 text-center text-slate-400 py-8">No medications found</div>
              )}
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
                <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                  <div className="text-sm text-green-800 dark:text-green-300">Today's Doses Taken</div>
                  <div className="font-medium text-green-800 dark:text-green-300">{summary?.dosesTaken ?? 0}</div>
                </div>
                <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <div className="text-sm text-red-800 dark:text-red-300">Today's Doses Missed</div>
                  <div className="font-medium text-red-800 dark:text-red-300">{summary?.dosesMissed ?? 0}</div>
                </div>
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <div className="text-sm text-blue-800 dark:text-blue-300">Overall Adherence Rate</div>
                  <div className="font-medium text-blue-800 dark:text-blue-300">{adherence?.rate ?? 0}%</div>
                </div>
                <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md">
                  <div className="text-sm text-purple-800 dark:text-purple-300">Total Doses Tracked</div>
                  <div className="font-medium text-purple-800 dark:text-purple-300">{(adherence?.taken || 0) + (adherence?.missed || 0)}</div>
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
      </>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
              {confirmAction.action === 'taken' ? 'Mark Dose as Taken?' : 'Mark Dose as Missed?'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to mark <span className="font-medium">{confirmAction.dose.medicationPlanId?.medicationName}</span> as {confirmAction.action === 'taken' ? 'taken' : 'missed'}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndMarkDose}
                className={confirmAction.action === 'taken' 
                  ? "px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                  : "px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
