import React from 'react'
import { HomeIcon, ClockIcon, BoxIcon, PillIcon, WarningIcon } from '../components/Icons'

// Admin dashboard with mock data placeholders; wire to real admin APIs when available.

const metrics = [
  { label: 'Active Patients', value: 1240, trend: '+3.2%' },
  { label: 'Active Caretakers', value: 210, trend: '+1.1%' },
  { label: 'Doctors', value: 86, trend: '+0.8%' },
  { label: 'Devices Online', value: '96%', trend: '+0.4%' },
]

const incidents = [
  { id: 'i1', type: 'Missed Doses', count: 18, status: 'Open', owner: 'Ops Team' },
  { id: 'i2', type: 'Refill Alerts', count: 12, status: 'Investigating', owner: 'Pharmacy' },
  { id: 'i3', type: 'Sync Failures', count: 4, status: 'Escalated', owner: 'Engineering' },
]

const systemHealth = [
  { service: 'API Gateway', status: 'Operational', latency: '142 ms' },
  { service: 'Device Sync', status: 'Degraded', latency: '480 ms' },
  { service: 'Notifications', status: 'Operational', latency: '118 ms' },
  { service: 'Analytics', status: 'Operational', latency: '205 ms' },
]

const refillQueues = [
  { id: 'rq1', name: 'Amlodipine 5mg', pending: 9, sla: '4h', risk: 'high' },
  { id: 'rq2', name: 'Metformin 500mg', pending: 6, sla: '8h', risk: 'medium' },
  { id: 'rq3', name: 'Lisinopril 10mg', pending: 3, sla: '8h', risk: 'low' },
]

type Props = { user: any }

export default function AdminDashboard({ user }: Props) {
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
          <div className="mt-2">Incidents</div>
        </div>
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <BoxIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Inventory</div>
        </div>
        <div className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          <PillIcon className="w-6 h-6 text-slate-700" />
          <div className="mt-2">Medications</div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="card">
            <div className="text-sm text-slate-500">{m.label}</div>
            <div className="text-2xl font-semibold mt-1">{m.value}</div>
            <div className="text-xs text-green-600 mt-1">{m.trend} vs last 7d</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Incidents */}
        <div className="col-span-7 card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Operational Incidents</h2>
              <p className="text-sm text-slate-500">Across all regions</p>
            </div>
            <div className="text-xs text-slate-500">Admin: {user?.name || '—'}</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {incidents.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{i.type}</div>
                  <div className="text-xs text-slate-500">Owner: {i.owner}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600 dark:text-slate-300">{i.count} open</div>
                  <div className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{i.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System health */}
        <div className="col-span-5 card">
          <h2 className="font-semibold mb-2">System Health</h2>
          <p className="text-sm text-slate-500 mb-3">Key services</p>
          <div className="space-y-3">
            {systemHealth.map((s) => (
              <div key={s.service} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{s.service}</div>
                    <div className="text-xs text-slate-500">{s.latency}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${s.status === 'Operational' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                    {s.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Refill queues */}
        <div className="col-span-5 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Refill Queues</h2>
            <span className="text-xs text-slate-500">SLA watch</span>
          </div>
          <div className="space-y-3">
            {refillQueues.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg border ${r.risk === 'high' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : r.risk === 'medium' ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                    <div className="text-xs text-slate-500">Pending: {r.pending}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <WarningIcon className={`w-4 h-4 ${r.risk === 'high' ? 'text-red-600' : r.risk === 'medium' ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span className="text-xs text-slate-600">SLA {r.sla}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="col-span-7 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Activity</h2>
            <span className="text-xs text-slate-500">Today</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {[
              'Synced 1,240 dose events',
              'Created 32 refill orders',
              'Updated 4 device firmware batches',
              'Resolved 12 incidents',
            ].map((text, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/60 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500 w-20">{['07:10','07:25','07:40','08:05'][idx]}</div>
                <div className="flex-1 text-sm text-slate-800 dark:text-slate-100">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
