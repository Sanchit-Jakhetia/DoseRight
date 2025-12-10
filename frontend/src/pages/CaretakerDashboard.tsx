import React from 'react'
import { ClockIcon, BoxIcon, PillIcon, WarningIcon, HomeIcon } from '../components/Icons'

// Simple caretaker dashboard with mock data until caretaker APIs are available.
// Mirrors the patient dashboard look/feel but focuses on patient oversight.

const mockPatients = [
  {
    id: 'p1',
    name: 'Ravi Kumar',
    nextDose: '08:30 AM',
    medicine: 'Metformin 500mg',
    adherence: 92,
    status: 'On Track',
    alerts: 1,
  },
  {
    id: 'p2',
    name: 'Anita Sharma',
    nextDose: '09:15 AM',
    medicine: 'Atorvastatin 20mg',
    adherence: 78,
    status: 'Needs Attention',
    alerts: 3,
  },
  {
    id: 'p3',
    name: 'Rahul Verma',
    nextDose: '10:00 AM',
    medicine: 'Lisinopril 10mg',
    adherence: 85,
    status: 'On Track',
    alerts: 0,
  },
]

const refillAlerts = [
  { id: 'r1', name: 'Metformin 500mg', patient: 'Ravi Kumar', remaining: '4 days', severity: 'medium' },
  { id: 'r2', name: 'Atorvastatin 20mg', patient: 'Anita Sharma', remaining: '2 days', severity: 'high' },
]

const activityLog = [
  { id: 'a1', time: '07:10 AM', text: 'Ravi took Metformin 500mg (On time)' },
  { id: 'a2', time: '07:30 AM', text: 'Anita missed Amlodipine 5mg (Follow-up needed)' },
  { id: 'a3', time: '06:50 AM', text: 'Rahul took Lisinopril 10mg (On time)' },
]

const schedule = [
  { id: 's1', patient: 'Ravi Kumar', time: '08:30 AM', med: 'Metformin 500mg', status: 'pending' },
  { id: 's2', patient: 'Anita Sharma', time: '09:15 AM', med: 'Atorvastatin 20mg', status: 'pending' },
  { id: 's3', patient: 'Rahul Verma', time: '10:00 AM', med: 'Lisinopril 10mg', status: 'pending' },
]

type Props = {
  user: any
}

export default function CaretakerDashboard({ user }: Props) {
  return (
    <div className="space-y-6">
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
          <div className="text-2xl font-semibold mt-1">{mockPatients.length}</div>
          <div className="text-xs text-green-600 mt-1">All online</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Doses today</div>
          <div className="text-2xl font-semibold mt-1">12</div>
          <div className="text-xs text-slate-500 mt-1">3 pending</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Refill alerts</div>
          <div className="text-2xl font-semibold mt-1">{refillAlerts.length}</div>
          <div className="text-xs text-amber-600 mt-1">Action required</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Average adherence</div>
          <div className="text-2xl font-semibold mt-1">85%</div>
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
            {mockPatients.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500">Next: {p.medicine} at {p.nextDose}</div>
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
            {schedule.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{item.patient}</div>
                  <div className="text-xs text-slate-500">{item.med}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-600"><ClockIcon className="w-4 h-4 inline mr-1" />{item.time}</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{item.status}</span>
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
            {refillAlerts.map((r) => (
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
            {activityLog.map((log) => (
              <div key={log.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/60 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500 w-20">{log.time}</div>
                <div className="flex-1 text-sm text-slate-800 dark:text-slate-100">{log.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
