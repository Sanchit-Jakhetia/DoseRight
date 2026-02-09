import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ClockIcon, BoxIcon, PillIcon, WarningIcon, HomeIcon } from '../components/Icons'

type Props = { user: any }

export default function DoctorDashboard({ user }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any>(null)

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8080'

  useEffect(() => {
    let active = true
    const fetchOverview = async () => {
      if (!user?.token) return
      setLoading(true)
      setError(null)
      try {
        const headers = { Authorization: `Bearer ${user.token}` }
        const response = await axios.get(`${API_BASE}/api/dashboard/doctor/overview`, { headers })
        if (active) setOverview(response.data)
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || 'Failed to load doctor data')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchOverview()
    return () => { active = false }
  }, [user, API_BASE])

  const summary = overview?.summary || { patientCount: 0, dosesToday: 0, avgAdherence: 0 }
  const patients = overview?.patients || []
  const clinicalTasks = overview?.clinicalTasks || []
  const refillAlerts = overview?.refillAlerts || []
  const activityLog = overview?.activity || []

  const isEmpty = useMemo(() => !loading && !error && patients.length === 0, [loading, error, patients.length])

  return (
    <div className="space-y-6">
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Top actions */}
      <div className="grid grid-cols-4 gap-4">
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <HomeIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Overview</div>
        </div>
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <ClockIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Today's List</div>
        </div>
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <BoxIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Refill Alerts</div>
        </div>
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <PillIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Medicines</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-slate-500">Patients</div>
          <div className="text-2xl font-semibold mt-1">{summary.patientCount}</div>
          <div className="text-xs text-green-600 mt-1">Active</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Doses today</div>
          <div className="text-2xl font-semibold mt-1">{summary.dosesToday}</div>
          <div className="text-xs text-slate-500 mt-1">Across assigned patients</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Refill alerts</div>
          <div className="text-2xl font-semibold mt-1">{refillAlerts.length}</div>
          <div className="text-xs text-amber-600 mt-1">Action required</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Avg adherence</div>
          <div className="text-2xl font-semibold mt-1">{summary.avgAdherence}%</div>
          <div className="text-xs text-slate-500 mt-1">Past 7 days</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Patient list */}
        <div className="col-span-7 card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Patients</h2>
              <p className="text-sm text-slate-500">Assigned to Dr. {user?.name || ''}</p>
            </div>
            <div className="text-xs text-slate-500">Adherence & visits</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {loading && (
              <div className="py-6 text-center text-slate-400">Loading patients...</div>
            )}
            {isEmpty && (
              <div className="py-6 text-center text-slate-400">No patients assigned</div>
            )}
            {!loading && patients.map((p: any) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.diagnosis}</div>
                  <div className="text-[11px] text-slate-500">Last: {p.lastVisit || '—'} · Next: {p.nextVisit || '—'}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${p.adherence >= 85 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${p.adherence}%` }}></div>
                  </div>
                  <div className="text-xs text-slate-500 w-10 text-right">{p.adherence}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical tasks */}
        <div className="col-span-5 card">
          <h2 className="font-semibold mb-2">Clinical Tasks</h2>
          <p className="text-sm text-slate-500 mb-3">Today & upcoming</p>
          <div className="space-y-3">
            {clinicalTasks.length === 0 && !loading && (
              <div className="text-center text-slate-400 py-6">No tasks right now</div>
            )}
            {clinicalTasks.map((t: any) => (
              <div key={t.id} className={`p-3 rounded-lg border ${t.priority === 'high' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : t.priority === 'medium' ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{t.task}</div>
                    <div className="text-xs text-slate-500">{t.patient}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-600">{t.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Refill alerts */}
        <div className="col-span-5 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Refill Alerts</h2>
            <span className="text-xs text-slate-500">Action required</span>
          </div>
          <div className="space-y-3">
            {refillAlerts.length === 0 && !loading && (
              <div className="text-center text-slate-400 py-6">No refill alerts</div>
            )}
            {refillAlerts.map((r: any) => (
              <div key={r.id} className={`p-3 rounded-lg border ${r.severity === 'high' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : r.severity === 'medium' ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.patient}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <WarningIcon className={`w-4 h-4 ${r.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                    <span className="text-xs text-slate-600">{r.remaining} left</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity log */}
        <div className="col-span-7 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Activity</h2>
            <span className="text-xs text-slate-500">Today</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {activityLog.length === 0 && !loading && (
              <div className="text-center text-slate-400 py-6">No recent activity</div>
            )}
            {activityLog.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/60 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500 w-20">{new Date(log.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="flex-1 text-sm text-slate-800 dark:text-slate-100">{log.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}