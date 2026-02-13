import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdherenceChart from '../components/AdherenceChart'
import { PlusIcon, ClockIcon, BoxIcon, PillIcon, WarningIcon, UserIcon, EditIcon } from '../components/Icons'

type Props = {
  user: any
  medicines: any[]
  schedule: any[]
  adherence: any
  summary: any
  profileData: any
  onOpenProfile: () => void
  onOpenAddMedicine: () => void
  onOpenHistory: () => void
  onOpenRefill: () => void
  onMarkDose: (doseId: string, dose: any, action: 'taken' | 'missed') => void
  onRefill: (medicationId: string) => void
  onEditMedicine: (medicine: any) => void
}

export default function PatientDashboard({
  user,
  medicines,
  schedule,
  adherence,
  summary,
  profileData,
  onOpenProfile,
  onOpenAddMedicine,
  onOpenHistory,
  onOpenRefill,
  onMarkDose,
  onRefill,
  onEditMedicine,
}: Props) {
  const formatDateDMY = (value?: string | number | Date) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatTime = (value?: string | number | Date) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString()
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="grid grid-cols-4 gap-4">
            <div onClick={onOpenProfile} className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
              <UserIcon className="w-6 h-6 text-slate-700" />
              <div className="mt-2">Profile</div>
            </div>
            <div onClick={onOpenAddMedicine} className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
              <PlusIcon className="w-6 h-6 text-slate-700" />
              <div className="mt-2">Add Medicine</div>
            </div>
            <div onClick={onOpenHistory} className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
              <ClockIcon className="w-6 h-6 text-slate-700" />
              <div className="mt-2">History</div>
            </div>
            <div onClick={onOpenRefill} className="top-action flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
              <BoxIcon className="w-6 h-6 text-slate-700" />
              <div className="mt-2">Refill</div>
            </div>
          </div>
        </div>

        {/* Device Status Section */}
        {profileData?.device || (summary && Object.keys(summary).length > 0) ? (
          <div className="col-span-12">
            <div className="card bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-2xl">📱</span> Device Status
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Medicine Dispenser Hardware</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  profileData?.device?.lastStatus === 'online'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${profileData?.device?.lastStatus === 'online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                  {profileData?.device?.lastStatus?.toUpperCase() || 'OFFLINE'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Device Name */}
                <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-cyan-100 dark:border-cyan-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Device Name</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{profileData?.device?.name || 'Pill Dispenser'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">ID: {profileData?.device?.deviceId || '—'}</div>
                </div>

                {/* Battery Level */}
                <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-cyan-100 dark:border-cyan-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Battery</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                    {profileData?.device?.batteryLevel ?? '—'}%
                  </div>
                  {profileData?.device?.batteryLevel !== undefined && (
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          profileData.device.batteryLevel > 50
                            ? 'bg-green-500'
                            : profileData.device.batteryLevel > 20
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${profileData.device.batteryLevel}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Last Connected */}
                <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-cyan-100 dark:border-cyan-800">
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Last Connected</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {profileData?.device?.lastHeartbeatAt ? (
                      <>
                        <div>{formatDateDMY(profileData.device.lastHeartbeatAt)}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{formatTime(profileData.device.lastHeartbeatAt)}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="col-span-8">
          <div className="card">
            <h2 className="font-semibold mb-2">Today's Schedule</h2>
            <p className="text-sm text-slate-500 mb-4">Your medicine schedule for today</p>
            <div className="space-y-3">
              {Array.isArray(schedule) && schedule.length > 0 ? (
                schedule.map((s: any) => {
                  const med = s.medicationPlanId
                  const scheduledTime = new Date(s.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  const statusDisplay = s.status === 'taken'
                    ? 'Taken'
                    : s.status === 'missed' || s.status === 'skipped'
                      ? 'Missed'
                      : s.status === 'pending'
                        ? 'Pending'
                        : s.status.charAt(0).toUpperCase() + s.status.slice(1)
                  const isFinal = s.status === 'taken' || s.status === 'missed' || s.status === 'skipped'

                  return (
                    <div key={s._id} className="schedule-item">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-cyan-600 border border-cyan-100">
                          <PillIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">{med?.medicationName || 'Unknown Medicine'}</div>
                          <div className="text-sm text-slate-500">{med?.medicationStrength || ''} {med?.medicationForm || ''}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600">
                          <ClockIcon className="w-4 h-4 inline-block mr-1 text-slate-500" />
                          {scheduledTime}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => onMarkDose(s._id, s, 'taken')}
                            disabled={isFinal}
                            className={`small-pill ${s.status === 'taken' ? 'status-taken cursor-not-allowed' : s.status === 'missed' || s.status === 'skipped' ? 'status-missed cursor-not-allowed' : 'status-upcoming hover:opacity-80'}`}
                          >
                            {statusDisplay}
                          </button>
                          <button
                            onClick={() => onMarkDose(s._id, s, 'missed')}
                            disabled={isFinal}
                            className="px-3 py-1 text-sm rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Miss
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-slate-400 py-8">No doses scheduled for today</div>
              )}
            </div>
          </div>

          <div className="card mt-6">
            <h2 className="font-semibold mb-2">Medicine Overview</h2>
            <p className="text-sm text-slate-500 mb-4">All your medicines</p>
            <div className="grid grid-cols-2 gap-4">
              {Array.isArray(medicines) && medicines.length > 0 ? (
                medicines.map((m: any) => {
                  const timesDisplay = m.times?.join(', ') || 'Not set'
                  const remaining = m.stock?.remaining || 0

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
                          <button
                            onClick={() => onEditMedicine(m)}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </div>
                      </div>
                      {remaining < 10 && (
                        <button
                          onClick={() => onRefill(m._id)}
                          className="mt-3 w-full py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
                        >
                          Request Refill
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
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
            <div className="mt-4">{adherence ? <AdherenceChart taken={adherence.taken} missed={adherence.missed} /> : <div>Loading chart…</div>}</div>
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
  )
}
