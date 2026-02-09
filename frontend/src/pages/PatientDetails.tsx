import React, { useState } from 'react'
import axios from 'axios'

type Props = {
  user: any
  onComplete: () => void
}

export default function PatientDetails({ user, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    allergies: '',
    illnesses: '',
    otherNotes: '',
    deviceId: '',
    timezone: 'UTC',
    slotCount: 4,
  })

  const API_BASE = (import.meta as any).env?.VITE_API_URL
    ?? (import.meta as any).env?.VITE_API_BASE_URL
    ?? 'http://localhost:8080'

  const getAuthHeaders = () => {
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.deviceId.trim()) {
      setError('Device ID is required')
      return
    }

    setLoading(true)
    try {
      const headers = getAuthHeaders()
      
      // Update patient profile with medical details
      await axios.patch(`${API_BASE}/api/dashboard/profile`, {
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(a => a),
        illnesses: formData.illnesses.split(',').map(i => i.trim()).filter(i => i),
        otherNotes: formData.otherNotes,
      }, { headers })

      // Create or update device
      await axios.post(`${API_BASE}/api/dashboard/device`, {
        deviceId: formData.deviceId,
        timezone: formData.timezone,
        slotCount: formData.slotCount,
      }, { headers })

      onComplete()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc] dark:bg-slate-900">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Welcome!</h1>
          <p className="text-slate-600 dark:text-slate-300">Let's complete your patient profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Device Information Section */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Device Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Device ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  placeholder="e.g., DR-2024-001"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your medicine dispenser ID</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="UTC">UTC</option>
                    <option value="IST">IST (India)</option>
                    <option value="EST">EST (US Eastern)</option>
                    <option value="CST">CST (US Central)</option>
                    <option value="PST">PST (US Pacific)</option>
                    <option value="GMT">GMT (UK)</option>
                    <option value="CET">CET (Europe)</option>
                    <option value="SGT">SGT (Singapore)</option>
                    <option value="AEST">AEST (Australia)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Number of Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.slotCount}
                    onChange={(e) => setFormData({...formData, slotCount: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Medicine slots in your device</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Section */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Medical Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Allergies
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                  placeholder="e.g., Penicillin, Peanuts (comma-separated)"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Medical Conditions
                </label>
                <input
                  type="text"
                  value={formData.illnesses}
                  onChange={(e) => setFormData({...formData, illnesses: e.target.value})}
                  placeholder="e.g., Diabetes, Hypertension (comma-separated)"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.otherNotes}
                  onChange={(e) => setFormData({...formData, otherNotes: e.target.value})}
                  placeholder="Any additional medical information..."
                  rows={4}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 font-medium transition-all"
          >
            {loading ? 'Setting up your profile...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
