import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdherenceChart from './components/AdherenceChart'
import { HomeIcon, PlusIcon, ClockIcon, BoxIcon, PillIcon, EditIcon, TrashIcon } from './components/Icons'

type Medicine = {
  id: number
  name: string
  dose: string
  frequency: string
  remaining: number
  status: string
}

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [schedule, setSchedule] = useState<Medicine[]>([])
  const [adherence, setAdherence] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)

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

  return (
    <div className="min-h-screen p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">DR</div>
          <div>
            <h1 className="text-xl font-semibold">DoseRight</h1>
            <div className="text-xs text-slate-500">Medication manager</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">sanchit.jakhetia</div>
          <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center">S</div>
          <button onClick={() => console.log('logout clicked')} className="ml-4 text-sm text-slate-600 hover:text-red-600 border border-transparent hover:border-red-100 px-3 py-1 rounded">Logout</button>
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
                    <div className="text-sm text-slate-600">{s.time ?? '—'}</div>
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
                <div key={m.id} className="border rounded-lg p-4 bg-white relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-slate-500">{m.dose} • {m.frequency}</div>
                      <div className="text-xs text-slate-400 mt-2">{m.remaining} tablets remaining</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded ${m.status === 'Taken' ? 'bg-green-100 text-green-700' : m.status === 'Missed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <button title="Edit" className="p-1 rounded-md hover:bg-slate-100"><EditIcon className="w-4 h-4 text-slate-600"/></button>
                    <button title="Delete" className="p-1 rounded-md hover:bg-slate-100"><TrashIcon className="w-4 h-4 text-red-600"/></button>
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
              <div className="flex justify-between">
                <div className="text-sm text-slate-600">Doses Taken</div>
                <div className="font-medium">{summary?.dosesTaken ?? '—'}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-slate-600">Doses Missed</div>
                <div className="font-medium">{summary?.dosesMissed ?? '—'}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-slate-600">Adherence Rate</div>
                <div className="font-medium">{adherence?.rate ?? '—'}%</div>
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
