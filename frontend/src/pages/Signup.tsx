import React, { useState } from 'react'
import { signup as doSignup, saveToken } from '../lib/auth'

type Props = {
  onClose?: () => void
  onSuccess: (user: any) => void
  isPage?: boolean
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+64', country: 'NZ', flag: '🇳🇿' },
  { code: '+27', country: 'ZA', flag: '🇿🇦' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+1-888', country: 'CA', flag: '🇨🇦' },
  { code: '+52', country: 'MX', flag: '🇲🇽' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+60', country: 'MY', flag: '🇲🇾' },
  { code: '+66', country: 'TH', flag: '🇹🇭' },
  { code: '+62', country: 'ID', flag: '🇮🇩' },
  { code: '+63', country: 'PH', flag: '🇵🇭' },
]

export default function Signup({ onClose, onSuccess, isPage }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'caretaker' | 'doctor' | 'admin'>('patient')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name || !email || !phone || !password) {
      setError('Please fill all fields')
      return
    }
    setLoading(true)
    try {
      const fullPhone = `${countryCode}${phone}`
      const response = await doSignup({ name, email, phone: fullPhone, password, role })
      saveToken(response.token)
      onSuccess(response.user)
      if (onClose) onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Signup failed'))
    } finally { setLoading(false) }
  }

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode)

  const content = (
    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Sign up</h2>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2 rounded-md border" />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2 rounded-md border" />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Phone Number</label>
          <div className="flex gap-2 mt-1">
            <div className="relative w-28">
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full p-2 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 flex items-center justify-between text-sm"
              >
                <span>{countryCode}</span>
                <span className="text-xs">▼</span>
              </button>
              
              {showCountryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {COUNTRY_CODES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setCountryCode(country.code)
                        setShowCountryDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-cyan-100 dark:hover:bg-slate-600 flex items-center gap-2 text-sm"
                    >
                      <span className="font-medium text-xs">{country.code}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{country.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone number"
              className="flex-1 p-2 rounded-md border dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full mt-1 p-2 rounded-md border dark:bg-slate-700 dark:border-slate-600">
            <option value="patient">Patient</option>
            <option value="caretaker">Caretaker</option>
            <option value="doctor">Doctor</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-2 rounded-md border" />
        </div>
        <div className="flex justify-end gap-2">
          {onClose && <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-700">Cancel</button>}
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-cyan-600 text-white">{loading ? 'Creating...' : 'Create account'}</button>
        </div>
      </form>
    </div>
  )

  if (isPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc] dark:bg-slate-900">
        {content}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      {content}
    </div>
  )
}
