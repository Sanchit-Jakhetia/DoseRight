import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdherenceChart from './components/AdherenceChart'
import AuthPage from './pages/AuthPage'
import PatientDetails from './pages/PatientDetails'
import PatientDashboard from './pages/PatientDashboard'
import CaretakerDashboard from './pages/CaretakerDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { HomeIcon, PlusIcon, ClockIcon, BoxIcon, PillIcon, EditIcon, TrashIcon, WarningIcon, SunIcon, MoonIcon, UserIcon } from './components/Icons'
import { 
  useMedicines, 
  useSchedule, 
  useAdherence, 
  useSummary, 
  useProfile, 
  useHistory,
  useMarkDose,
  useAddMedicine,
  useUpdateMedicine,
  useRefillMedicine,
  useUpdateProfile,
  usePrefetchDashboard,
  useInvalidateAll,
  useRefreshDashboard,
} from './hooks/useApi'

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

  const [user, setUser] = useState<any>(null)
  
  // Use cached data hooks - data loads instantly from cache, refreshes in background
  const { data: medicines = [] } = useMedicines(user?.token)
  const { data: schedule = [] } = useSchedule(user?.token)
  const { data: adherence = null } = useAdherence(user?.token)
  const { data: summary = null } = useSummary(user?.token)
  const { data: profileData = null } = useProfile(user?.token)
  
  // History is loaded on-demand when panel is opened
  const [showHistory, setShowHistory] = useState(false)
  const { data: historyData, refetch: refetchHistory } = useHistory(user?.token, showHistory)
  
  // Mutations with automatic cache invalidation
  const markDoseMutation = useMarkDose(user?.token)
  const addMedicineMutation = useAddMedicine(user?.token)
  const updateMedicineMutation = useUpdateMedicine(user?.token)
  const refillMedicineMutation = useRefillMedicine(user?.token)
  const updateProfileMutation = useUpdateProfile(user?.token)
  
  // Prefetch helper for login
  const prefetchDashboard = usePrefetchDashboard(user?.token)
  const invalidateAll = useInvalidateAll()
  const refreshDashboard = useRefreshDashboard()
  
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [newPatient, setNewPatient] = useState<any>(null)
  const [route, setRoute] = useState<string>(() => window.location.pathname || '/')
  const [confirmAction, setConfirmAction] = useState<any>(null)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null)
  const [showRefill, setShowRefill] = useState(false)
  // refillMedicines now uses the cached `medicines` data from the hook
  const [showProfile, setShowProfile] = useState(false)
  // profileData now comes from the useProfile hook
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    allergies: '',
    illnesses: '',
    otherNotes: '',
  })
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

  const resetMedicineForm = () => {
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
  }

  // API base - use Vite env if provided, otherwise default to backend port 8080
  const API_BASE = (import.meta as any).env?.VITE_API_URL
    ?? (import.meta as any).env?.VITE_API_BASE_URL
    ?? 'http://localhost:8080'

  const getAuthHeaders = () => {
    const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {}
    if (!user?.token) {
      console.warn('⚠️ No token in user object:', user)
    }
    return headers
  }

  const handleMarkDose = (doseId: string, dose: any, action: 'taken' | 'missed') => {
    // Show confirmation dialog with action type
    setConfirmAction({ doseId, dose, action })
  }

  const confirmAndMarkDose = async () => {
    if (!confirmAction) return
    
    try {
      await markDoseMutation.mutateAsync({
        doseId: confirmAction.doseId,
        action: confirmAction.action,
      })
      setConfirmAction(null)
      // Cache is automatically invalidated by the mutation
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
      await refillMedicineMutation.mutateAsync({
        medicationId: medicationPlanId,
        amount: Number(amount),
      })
      // Cache is automatically invalidated by the mutation
      alert('Medication refilled successfully!')
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to refill medication')
    }
  }

  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
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
      
      if (editingMedicineId) {
        await updateMedicineMutation.mutateAsync({
          id: editingMedicineId,
          data: {
            ...medicineData,
            stockRemaining: Number(addMedicineForm.stockRemaining),
          },
        })
      } else {
        await addMedicineMutation.mutateAsync(medicineData)
      }

      // Reset form and close modal - cache is automatically invalidated
      resetMedicineForm()
      setShowAddMedicine(false)
      setEditingMedicineId(null)
      alert(editingMedicineId ? 'Medicine updated successfully!' : 'Medicine added successfully!')
    } catch (error: any) {
      alert(error?.response?.data?.message || (editingMedicineId ? 'Failed to update medicine' : 'Failed to add medicine'))
    }
  }

  const openEditMedicine = (medicine: any) => {
    const times = Array.isArray(medicine.times) && medicine.times.length > 0 ? medicine.times : ['08:00']
    const daysOfWeek = Array.isArray(medicine.daysOfWeek) ? medicine.daysOfWeek : [1, 2, 3, 4, 5, 6, 7]
    const repetitionType = daysOfWeek.length === 7 ? 'daily' : (daysOfWeek.length > 0 ? 'weekly' : 'monthly')

    setAddMedicineForm({
      medicationName: medicine.medicationName || '',
      medicationStrength: medicine.medicationStrength || '',
      medicationForm: medicine.medicationForm || 'tablet',
      dosagePerIntake: Number(medicine.dosagePerIntake) || 1,
      slotIndex: Number(medicine.slotIndex) || 1,
      times,
      repetitionType,
      daysOfWeek,
      startDate: medicine.startDate ? new Date(medicine.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: medicine.endDate ? new Date(medicine.endDate).toISOString().split('T')[0] : '',
      stockRemaining: Number(medicine.stock?.remaining) || 0,
    })
    setEditingMedicineId(medicine._id)
    setShowAddMedicine(true)
  }

  const fetchHistory = async () => {
    if (!user) return
    setShowHistory(true)
    // Data will be fetched by the useHistory hook when showHistory becomes true
    refetchHistory()
  }

  const openRefillPanel = async () => {
    if (!user) return
    // Use cached medicines data from the hook
    setShowRefill(true)
  }

  const handleQuickRefill = async (medicationId: string, amount: number) => {
    try {
      await refillMedicineMutation.mutateAsync({ medicationId, amount })
      // Cache is automatically invalidated by the mutation
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to refill medication')
    }
  }

  const openProfilePanel = async () => {
    if (!user) return
    
    // Use cached profile data from the hook
    if (profileData) {
      setProfileForm({
        name: profileData.user?.name || '',
        email: profileData.user?.email || '',
        phone: profileData.user?.phone || '',
        allergies: profileData.patient?.medicalProfile?.allergies?.join(', ') || '',
        illnesses: profileData.patient?.medicalProfile?.illnesses?.map((i: any) => i.name).join(', ') || '',
        otherNotes: profileData.patient?.medicalProfile?.otherNotes || '',
      })
    }
    
    setShowProfile(true)
    setEditingProfile(false)
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    
    try {
      await updateProfileMutation.mutateAsync({
        name: profileForm.name,
        phone: profileForm.phone,
        allergies: profileForm.allergies.split(',').map(a => a.trim()).filter(a => a),
        illnesses: profileForm.illnesses.split(',').map(i => i.trim()).filter(i => i),
        otherNotes: profileForm.otherNotes,
      })
      
      alert('Profile updated successfully!')
      setEditingProfile(false)
      // Cache is automatically invalidated by the mutation
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update profile')
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

  // Update document title based on route and user role
  useEffect(() => {
    if (route === '/login') {
      document.title = 'Login - DoseRight'
    } else if (route === '/signup') {
      document.title = 'Sign Up - DoseRight'
    } else if (user) {
      const roleTitle = user.role === 'admin' ? 'Admin Dashboard' :
                        user.role === 'doctor' ? 'Doctor Dashboard' :
                        user.role === 'caretaker' ? 'Caretaker Dashboard' :
                        'Patient Dashboard'
      document.title = `${roleTitle} - DoseRight`
    } else {
      document.title = 'DoseRight - Smart Medication Management'
    }
  }, [route, user])

  // Basic route guard: if user is not authenticated, redirect to /login for protected routes
  useEffect(() => {
    // if not logged in and not on auth pages, force to /login
    if (!user && route !== '/login' && route !== '/signup') {
      navigate('/login')
    }
  }, [route, user])

  // Data is now automatically fetched by the hooks when user.token is available

  // On mount, try to read persisted auth and token
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth')
      if (raw) {
        const userData = JSON.parse(raw)
        // Token should be in userData from login/signup response
        setUser(userData)
      }
    } catch (e) {}
  }, [])

  return (
    <div className="min-h-screen p-6">
      {/* Patient Details Form - Show after login if patient has no profile */}
      {showPatientDetails && newPatient ? (
        <PatientDetails 
          user={newPatient}
          onComplete={() => {
            // Ensure user is properly set with token
            const userToSet = { ...newPatient }
            setUser(userToSet)
            localStorage.setItem('auth', JSON.stringify(userToSet))
            setShowPatientDetails(false)
            setNewPatient(null)
            // Navigate to dashboard after state is updated
            setTimeout(() => {
              navigate('/')
            }, 100)
          }}
        />
      ) : (route === '/login' || route === '/signup') ? (
        <AuthPage 
          initialTab={route === '/signup' ? 'signup' : 'login'} 
          onClose={() => navigate('/')} 
          onSuccess={async (u) => {
            // If patient role and new login, check if patient profile exists
            if (u.role === 'patient' && u.isNewLogin) {
              try {
                const headers = { Authorization: `Bearer ${u.token}` }
                const response = await axios.get(`${API_BASE}/api/dashboard/profile`, { headers })
                
                // Check if patient has device assigned (full profile)
                if (!response.data.device) {
                  // No device/profile, show details form
                  setNewPatient(u)
                  setShowPatientDetails(true)
                  return
                }
              } catch (error) {
                // If profile doesn't exist or error, show details form
                setNewPatient(u)
                setShowPatientDetails(true)
                return
              }
            }
            
            // Otherwise proceed normally
            setUser(u)
            localStorage.setItem('auth', JSON.stringify(u))
            navigate('/')
          }} 
        />
      ) : (
        <>
          <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="DoseRight" className="w-8 h-8 object-contain" />
          </div>
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
            <button onClick={() => { invalidateAll(); setUser(null); localStorage.removeItem('auth'); navigate('/') }} className="ml-2 text-sm text-slate-600 hover:text-red-600 border border-transparent hover:border-red-100 px-3 py-1 rounded">Logout</button>
          ) : null}
        </div>
      </header>

      {user?.role === 'admin' ? (
        <AdminDashboard user={user} />
      ) : user?.role === 'caretaker' ? (
        <CaretakerDashboard user={user} />
      ) : user?.role === 'doctor' ? (
        <DoctorDashboard user={user} />
      ) : (
        <PatientDashboard
          user={user}
          medicines={medicines}
          schedule={schedule}
          adherence={adherence}
          summary={summary}
          profileData={profileData}
          onOpenProfile={openProfilePanel}
          onOpenAddMedicine={() => {
            resetMedicineForm()
            setEditingMedicineId(null)
            setShowAddMedicine(true)
          }}
          onOpenHistory={fetchHistory}
          onOpenRefill={openRefillPanel}
          onMarkDose={handleMarkDose}
          onRefill={handleRefill}
          onEditMedicine={openEditMedicine}
        />
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
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {editingMedicineId ? 'Edit Medicine' : 'Add New Medicine'}
              </h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => {
                    setShowAddMedicine(false)
                    setEditingMedicineId(null)
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none"
                >
                  ×
                </button>
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
                  onClick={() => {
                    setShowAddMedicine(false)
                    setEditingMedicineId(null)
                  }}
                  className="px-4 py-2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-medium"
                >
                  {editingMedicineId ? 'Save Changes' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-5xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-6 rounded-t-xl flex items-center justify-between">
              <div className="flex-1"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Medication History</h2>
              <div className="flex-1 flex justify-end">
                <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none">×</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {historyData ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">{historyData.summary?.totalTaken || 0}</div>
                      <div className="text-sm text-green-600 dark:text-green-400">Doses Taken</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-300">{historyData.summary?.totalMissed || 0}</div>
                      <div className="text-sm text-red-600 dark:text-red-400">Doses Missed</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{historyData.summary?.adherenceRate || 0}%</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Adherence Rate</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{historyData.summary?.currentStreak || 0}</div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">Day Streak</div>
                    </div>
                  </div>

                  {/* Weekly Trend */}
                  {historyData.weeklyTrend && historyData.weeklyTrend.length > 0 && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Weekly Adherence Trend</h3>
                      <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
                        {historyData.weeklyTrend.map((day: any, idx: number) => {
                          const percentage = day.total > 0 ? (day.taken / day.total) * 100 : 0
                          const barHeight = percentage > 0 ? Math.max(percentage, 5) : 0 // Minimum 5% for visibility
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                                {day.total > 0 ? `${percentage.toFixed(0)}%` : '-'}
                              </div>
                              <div className="w-full flex flex-col justify-end items-center" style={{ height: '140px' }}>
                                {day.total > 0 ? (
                                  <div 
                                    className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg transition-all hover:from-cyan-600 hover:to-cyan-500"
                                    style={{ height: `${barHeight}%`, minHeight: '4px' }}
                                  ></div>
                                ) : (
                                  <div className="w-full bg-slate-200 dark:bg-slate-500 rounded" style={{ height: '4px' }}></div>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">{day.day}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{day.taken}/{day.total}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Medication History by Medicine */}
                  {historyData.byMedicine && historyData.byMedicine.length > 0 && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">History by Medicine</h3>
                      <div className="space-y-4">
                        {historyData.byMedicine.map((med: any, idx: number) => (
                          <div key={idx} className="border dark:border-slate-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">{med.medicationName}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {med.medicationStrength} {med.medicationForm}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {med.taken}/{med.total} doses
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {med.adherenceRate}% adherence
                                </div>
                              </div>
                            </div>
                            <div className="relative h-2 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div 
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full"
                                style={{ width: `${med.adherenceRate}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Dose Logs */}
                  {historyData.recentLogs && historyData.recentLogs.length > 0 && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Activity (Last 30 Days)</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {historyData.recentLogs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-600 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-2 h-2 rounded-full ${
                                log.status === 'taken' ? 'bg-green-500' : 
                                log.status === 'missed' ? 'bg-red-500' : 
                                'bg-yellow-500'
                              }`}></div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {log.medicationPlanId?.medicationName || 'Unknown Medicine'}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {new Date(log.scheduledAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} at {new Date(log.scheduledAt).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                log.status === 'taken' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                log.status === 'missed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              }`}>
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-slate-500 dark:text-slate-400">Loading history...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {showRefill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-3xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-6 rounded-t-xl flex items-center justify-between">
              <div className="flex-1"></div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Refill Medications</h2>
              <div className="flex-1 flex justify-end">
                <button onClick={() => setShowRefill(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none">×</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {medicines.length > 0 ? (
                <div className="space-y-4">
                  {medicines.map((med: any) => {
                    const remaining = med.stock?.remaining || 0
                    const totalLoaded = med.stock?.totalLoaded || 0
                    const percentage = totalLoaded > 0 ? (remaining / totalLoaded) * 100 : 0
                    const isLow = percentage < 30
                    const isCritical = percentage < 10
                    
                    return (
                      <div key={med._id} className={`border rounded-lg p-5 ${
                        isCritical ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' :
                        isLow ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' :
                        'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{med.medicationName}</h3>
                              {isCritical && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">
                                  Critical
                                </span>
                              )}
                              {isLow && !isCritical && (
                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-medium">
                                  Low Stock
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {med.medicationStrength} {med.medicationForm} • Slot {med.slotIndex}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              Times: {med.times?.join(', ') || 'Not set'}
                            </div>
                          </div>
                        </div>

                        {/* Stock Info */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Current Stock</span>
                            <span className={`text-sm font-semibold ${
                              isCritical ? 'text-red-700 dark:text-red-300' :
                              isLow ? 'text-yellow-700 dark:text-yellow-300' :
                              'text-slate-900 dark:text-slate-100'
                            }`}>
                              {remaining} {med.medicationForm}s remaining
                            </span>
                          </div>
                          <div className="relative h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div 
                              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                                isCritical ? 'bg-gradient-to-r from-red-600 to-red-500' :
                                isLow ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                                'bg-gradient-to-r from-green-500 to-green-400'
                              }`}
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{percentage.toFixed(0)}% remaining</span>
                            <span>Total capacity: {totalLoaded}</span>
                          </div>
                        </div>

                        {/* Usage Info */}
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-600 rounded-lg">
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Daily Usage</div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {med.dosagePerIntake * (med.times?.length || 0)} {med.medicationForm}s per day
                          </div>
                          {remaining > 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Estimated days remaining: ~{Math.floor(remaining / (med.dosagePerIntake * (med.times?.length || 1)))} days
                            </div>
                          )}
                        </div>

                        {/* Quick Refill Buttons */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quick Refill</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[10, 20, 30, 50].map(amount => (
                              <button
                                key={amount}
                                onClick={() => handleQuickRefill(med._id, amount)}
                                className="px-3 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-md hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors text-sm font-medium"
                              >
                                +{amount}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              const amount = prompt(`Enter refill amount for ${med.medicationName}:`)
                              if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
                                handleQuickRefill(med._id, Number(amount))
                              }
                            }}
                            className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
                          >
                            Custom Refill Amount
                          </button>
                        </div>

                        {/* Last Refill Info */}
                        {med.stock?.lastRefilledAt && (
                          <div className="mt-3 pt-3 border-t dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                            Last refilled: {new Date(med.stock.lastRefilledAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BoxIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                  <div className="text-slate-500 dark:text-slate-400 text-lg font-medium">No medications to refill</div>
                  <div className="text-slate-400 dark:text-slate-500 text-sm mt-2">Add medicines to get started</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 p-6 rounded-t-xl flex items-center justify-between">
              <div className="flex-1">
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Patient Profile</h2>
              <div className="flex-1 flex justify-end">
                <button onClick={() => { setShowProfile(false); setEditingProfile(false); }} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none">×</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {profileData ? (
                editingProfile ? (
                  /* Edit Mode */
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                          <input
                            type="email"
                            value={profileForm.email}
                            disabled
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email cannot be changed</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Medical Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Allergies</label>
                          <input
                            type="text"
                            value={profileForm.allergies}
                            onChange={(e) => setProfileForm({...profileForm, allergies: e.target.value})}
                            placeholder="e.g., Penicillin, Peanuts (comma-separated)"
                            className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medical Conditions</label>
                          <input
                            type="text"
                            value={profileForm.illnesses}
                            onChange={(e) => setProfileForm({...profileForm, illnesses: e.target.value})}
                            placeholder="e.g., Diabetes, Hypertension (comma-separated)"
                            className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Additional Notes</label>
                          <textarea
                            value={profileForm.otherNotes}
                            onChange={(e) => setProfileForm({...profileForm, otherNotes: e.target.value})}
                            placeholder="Any additional medical information or notes..."
                            rows={4}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleUpdateProfile}
                        className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="space-y-6">
                  {/* User Info Card */}
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-cyan-200 dark:border-cyan-700">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                        {(profileData.user?.name || 'U')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{profileData.user?.name || 'Unknown'}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{profileData.user?.role || 'Patient'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400">📧</span>
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Email</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{profileData.user?.email || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Phone</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{profileData.user?.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          profileData.user?.isActive 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {profileData.user?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Device Information */}
                  {profileData.device && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <span className="text-cyan-600 dark:text-cyan-400">📱</span>
                        Device Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Device ID</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono">{profileData.device.deviceId || 'Not assigned'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Slots</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{profileData.device.slotCount || 0} slots</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Timezone</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{profileData.device.timezone || 'UTC'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            profileData.device.lastStatus === 'online' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                              : profileData.device.lastStatus === 'offline'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {profileData.device.lastStatus?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        {profileData.device.lastHeartbeatAt && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Last Connected</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{new Date(profileData.device.lastHeartbeatAt).toLocaleString()}</span>
                          </div>
                        )}
                        {profileData.device.batteryLevel !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Battery</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    profileData.device.batteryLevel > 50 ? 'bg-green-500' :
                                    profileData.device.batteryLevel > 20 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${profileData.device.batteryLevel}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{profileData.device.batteryLevel}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Medical Profile */}
                  {profileData.patient?.medicalProfile && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <span className="text-cyan-600 dark:text-cyan-400">🏥</span>
                        Medical Profile
                      </h3>
                      <div className="space-y-4">
                        {profileData.patient.medicalProfile.allergies && profileData.patient.medicalProfile.allergies.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Allergies</div>
                            <div className="flex flex-wrap gap-2">
                              {profileData.patient.medicalProfile.allergies.map((allergy: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                                  {allergy}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {profileData.patient.medicalProfile.illnesses && profileData.patient.medicalProfile.illnesses.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medical Conditions</div>
                            <div className="space-y-2">
                              {profileData.patient.medicalProfile.illnesses.map((illness: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-600 rounded-lg">
                                  <span className="text-sm text-slate-900 dark:text-slate-100">{illness.name}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    illness.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                    illness.status === 'under_control' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {illness.status?.replace('_', ' ') || 'Ongoing'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {profileData.patient.medicalProfile.otherNotes && (
                          <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Additional Notes</div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-600 rounded-lg">
                              {profileData.patient.medicalProfile.otherNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Account Info */}
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-6 border dark:border-slate-600">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400">📅</span>
                      Account Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Member Since</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {new Date(profileData.user?.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Last Updated</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {new Date(profileData.user?.updatedAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                )
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-slate-500 dark:text-slate-400">Loading profile...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    )}
    </div>
  )
}
