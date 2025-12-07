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
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [addMedicineForm, setAddMedicineForm] = useState({
    medicationName: '',
    medicationStrength: '',
    medicationForm: 'tablet',
    dosagePerIntake: 1,
    slotIndex: 1,
    times: ['08:00'],
    repetitionType: 'daily', // 'daily', 'monthly', 'weekly', 'custom'
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7], // 1-7 for Mon-Sun
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    stockRemaining: 0,
  })

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

  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const headers = getAuthHeaders()
      
      // Prepare data for backend
      const medicineData = {
        medicationName: addMedicineForm.medicationName,
        medicationStrength: addMedicineForm.medicationStrength || undefined,
        medicationForm: addMedicineForm.medicationForm,
        dosagePerIntake: Number(addMedicineForm.dosagePerIntake),
        slotIndex: Number(addMedicineForm.slotIndex),
        times: addMedicineForm.times,
        daysOfWeek: addMedicineForm.daysOfWeek,
        startDate: new Date(addMedicineForm.startDate),
        endDate: addMedicineForm.endDate ? new Date(addMedicineForm.endDate) : null,
        active: true,
        stock: {
          remaining: Number(addMedicineForm.stockRemaining),
          totalLoaded: Number(addMedicineForm.stockRemaining),
        }
      }
      
      const response = await axios.post(`${API_BASE}/api/dashboard/medicines`, medicineData, { headers })
      
      // Reset form and close modal
      setAddMedicineForm({
        medicationName: '',
        medicationStrength: '',
        medicationForm: 'tablet',
        dosagePerIntake: 1,
        slotIndex: 1,
        times: ['08:00'],
        repetitionType: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        stockRemaining: 0,
      })
      setShowAddMedicine(false)
      fetchDashboardData()
      alert('Medicine added successfully!')
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to add medicine')
    }
  }

  const updateRepetition = (type: string) => {
    setAddMedicineForm(prev => {
      const days = [1, 2, 3, 4, 5, 6, 7]
      switch(type) {
        case 'daily':
          return { ...prev, repetitionType: 'daily', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }
        case 'weekly':
          return { ...prev, repetitionType: 'weekly', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }
        case 'monthly':
          return { ...prev, repetitionType: 'monthly', daysOfWeek: [] }
        default:
          return { ...prev, repetitionType: type }
      }
    })
  }

  const toggleDayOfWeek = (day: number) => {
    setAddMedicineForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }

  const addTime = () => {
    setAddMedicineForm(prev => ({
      ...prev,
      times: [...prev.times, '12:00']
    }))
  }

  const removeTime = (index: number) => {
    setAddMedicineForm(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }))
  }

  const updateTime = (index: number, value: string) => {
    setAddMedicineForm(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? value : t)
    }))
  }

  const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const shouldHighlightDate = (day: number | null, month: number, year: number) => {
    if (!day) return false
    
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    
    // Check if date is within start/end range
    const startDate = addMedicineForm.startDate ? new Date(addMedicineForm.startDate) : null
    const endDate = addMedicineForm.endDate ? new Date(addMedicineForm.endDate) : null
    
    if (startDate) {
      startDate.setHours(0, 0, 0, 0)
      if (date < startDate) return false
    }
    
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
      if (date > endDate) return false
    }
    
    // Check repetition pattern
    if (addMedicineForm.repetitionType === 'daily') {
      return true
    } else if (addMedicineForm.repetitionType === 'weekly') {
      return addMedicineForm.daysOfWeek.includes(adjustedDay)
    }
    return false
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
            <div onClick={() => setShowAddMedicine(true)} className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"> <PlusIcon className="w-6 h-6 text-slate-700"/> <div className="mt-2">Add Medicine</div> </div>
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

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-2xl my-8">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-6 rounded-t-xl flex items-center justify-between">
              <div className="flex-1"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add New Medicine</h2>
              <div className="flex-1 flex justify-end">
                <button onClick={() => setShowAddMedicine(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none">×</button>
              </div>
            </div>
            
            <form onSubmit={handleAddMedicineSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Medicine Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medicine Name *</label>
                    <input
                      type="text"
                      required
                      value={addMedicineForm.medicationName}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, medicationName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="e.g., Paracetamol"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Strength</label>
                    <input
                      type="text"
                      value={addMedicineForm.medicationStrength}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, medicationStrength: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="e.g., 500mg"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Form *</label>
                    <select
                      value={addMedicineForm.medicationForm}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, medicationForm: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup</option>
                      <option value="injection">Injection</option>
                      <option value="cream">Cream</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Device Slot *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={addMedicineForm.slotIndex}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, slotIndex: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dose per Intake *</label>
                    <input
                      type="number"
                      required
                      min="0.25"
                      step="0.25"
                      value={addMedicineForm.dosagePerIntake}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, dosagePerIntake: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              {/* Times */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Times to Take Medicine *</h3>
                <div className="space-y-2">
                  {addMedicineForm.times.map((time, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => updateTime(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                      {addMedicineForm.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTime(idx)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTime}
                  className="w-full px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  + Add Another Time
                </button>
              </div>

              {/* Repetition */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Repetition Pattern *</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['daily', 'weekly', 'monthly'].map(rep => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => updateRepetition(rep)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        addMedicineForm.repetitionType === rep
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {rep.charAt(0).toUpperCase() + rep.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Days of Week Selector */}
                {addMedicineForm.repetitionType === 'weekly' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Days *</label>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                        const dayNum = idx + 1
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => toggleDayOfWeek(dayNum)}
                            className={`py-2 rounded-md text-sm font-medium transition-colors ${
                              addMedicineForm.daysOfWeek.includes(dayNum)
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Calendar Preview */}
              {addMedicineForm.repetitionType !== 'monthly' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Calendar Preview (Current Month)</h3>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-xs font-semibold text-slate-600 dark:text-slate-400">{d}</div>
                      ))}
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const currentMonth = new Date().getMonth()
                        return getCalendarDays(currentYear, currentMonth).map((day, idx) => (
                          <div
                            key={idx}
                            className={`p-2 text-xs rounded ${
                              shouldHighlightDate(day, currentMonth, currentYear)
                                ? 'bg-cyan-200 dark:bg-cyan-900/50 text-cyan-900 dark:text-cyan-100 font-semibold'
                                : day ? 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-400' : ''
                            }`}
                          >
                            {day}
                          </div>
                        ))
                      })()}
                    </div>
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                      Highlighted dates show when medicine will be taken based on your schedule
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Duration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={addMedicineForm.startDate}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={addMedicineForm.endDate}
                      onChange={(e) => setAddMedicineForm({...addMedicineForm, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Stock</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Initial Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    value={addMedicineForm.stockRemaining}
                    onChange={(e) => setAddMedicineForm({...addMedicineForm, stockRemaining: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddMedicine(false)}
                  className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-medium"
                >
                  Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
