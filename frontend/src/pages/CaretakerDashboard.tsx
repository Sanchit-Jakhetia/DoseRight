import React, { useMemo } from 'react'
import { ClockIcon, BoxIcon, PillIcon, WarningIcon, HomeIcon } from '../components/Icons'
import { useCaretakerOverview } from '../hooks/useApi'

type Props = {
  user: any
}

export default function CaretakerDashboard({ user }: Props) {
  // Use cached data - loads instantly after first fetch, refreshes in background
  const { data: overview, isLoading: loading, error: queryError } = useCaretakerOverview(user?.token)
  const error = queryError ? (queryError as any)?.response?.data?.message || 'Failed to load caretaker data' : null

  const summary = overview?.summary || { patientCount: 0, dosesToday: 0, pendingToday: 0, avgAdherence: 0 }
  const patients = overview?.patients || []
  const schedule = overview?.schedule || []
  const pendingSchedule = schedule.filter((item: any) => item.status === 'pending')
  const completedSchedule = schedule.filter((item: any) => item.status !== 'pending')
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
          <div className="mt-2">Today's Rounds</div>
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
          <div className="text-xs text-slate-500 mt-1">Managed patients</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Doses today</div>
          <div className="text-2xl font-semibold mt-1">{summary.dosesToday}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.pendingToday} pending</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Refill alerts</div>
          <div className="text-2xl font-semibold mt-1">{refillAlerts.length}</div>
          <div className="text-xs text-amber-600 mt-1">Action required</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Average adherence</div>
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
              <p className="text-sm text-slate-500">Assigned to {user?.name || 'you'}</p>
            </div>
            <div className="text-xs text-slate-500">Live status</div>
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
                  <div className="text-xs text-slate-500">
                    Next: {p.nextDoseMedicine || '—'} at {p.nextDoseTime ? new Date(p.nextDoseTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600">{p.status}</div>
                  <div className="w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${p.adherence >= 85 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${p.adherence}%` }}></div>
                  </div>
                  <div className="text-xs text-slate-500 w-10 text-right">{p.adherence}%</div>
                  {p.alerts > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">{p.alerts} alerts</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's schedule */}
        <div className="col-span-5 card">
          <h2 className="font-semibold mb-2">Today's Rounds</h2>
          <p className="text-sm text-slate-500 mb-3">Upcoming doses you oversee</p>
          <div className="space-y-3">
            {pendingSchedule.length === 0 && completedSchedule.length === 0 && !loading && (
              <div className="text-center text-slate-400 py-6">No doses for today</div>
            )}

            {pendingSchedule.length > 0 && (
              <div>
                <div className="text-xs uppercase text-slate-500 mb-2">Pending</div>
                <div className="space-y-3">
                  {pendingSchedule.map((item: any) => (
                    <div key={item.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.patient}</div>
                        <div className="text-xs text-slate-500">{item.med}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600"><ClockIcon className="w-4 h-4 inline mr-1" />{new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedSchedule.length > 0 && (
              <div>
                <div className="text-xs uppercase text-slate-500 mb-2">Completed</div>
                <div className="space-y-3">
                  {completedSchedule.map((item: any) => (
                    <div key={item.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.patient}</div>
                        <div className="text-xs text-slate-500">{item.med}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600"><ClockIcon className="w-4 h-4 inline mr-1" />{new Date(item.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'taken' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                          {item.status === 'taken' ? 'Taken' : 'Missed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div key={r.id} className={`p-3 rounded-lg border ${r.severity === 'high' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'}`}>
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
