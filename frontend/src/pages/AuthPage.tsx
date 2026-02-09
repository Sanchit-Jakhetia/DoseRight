import React, { useState } from 'react'
import { login as doLogin, signup as doSignup, saveToken } from '../lib/auth'

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

type Props = {
  initialTab?: 'login' | 'signup'
  onSuccess: (user: any) => void
  onClose?: () => void
}

export default function AuthPage({ initialTab = 'login', onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab)

  // login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // signup state
  const [name, setName] = useState('')
  const [semail, setSemail] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [role, setRole] = useState<'patient' | 'caretaker' | 'doctor' | 'admin'>('patient')
  const [spassword, setSPassword] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    try {
      const response = await doLogin({ email, password })
      saveToken(response.token)
      // Pass the full response with token and user, including role for profile check
      onSuccess({ ...response.user, token: response.token, isNewLogin: true })
      if (onClose) onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Login failed'))
    } finally { setLoading(false) }
  }

  const submitSignup = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!name || !semail || !phone || !spassword) { setError('Please fill all fields'); return }
    setLoading(true)
    try {
      const fullPhone = `${countryCode}${phone}`
      const response = await doSignup({ name, email: semail, phone: fullPhone, password: spassword, role })
      saveToken(response.token)
      // Show success message
      setSignupSuccess(true)
      // Reset form
      setName('')
      setSemail('')
      setPhone('')
      setSPassword('')
      // After 2 seconds, switch to login tab
      setTimeout(() => {
        setSignupSuccess(false)
        setTab('login')
      }, 2000)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Signup failed'))
    } finally { setLoading(false) }
  }

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode)

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('/src/assets/pattern.png')] bg-[length:240px] dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-3">
            <img src="/logo.png" alt="DoseRight" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">DoseRight</h1>
          <div className="text-sm text-slate-500 dark:text-slate-300">Your Smart Medicine Partner</div>
        </div>

        <div className="mt-6 bg-slate-100 dark:bg-slate-700 rounded-full p-1 flex">
          <button className={`w-1/2 py-2 rounded-full ${tab === 'login' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-200'}`} onClick={() => setTab('login')}>Login</button>
          <button className={`w-1/2 py-2 rounded-full ${tab === 'signup' ? 'bg-white dark:bg-slate-800 shadow' : 'text-slate-600 dark:text-slate-200'}`} onClick={() => setTab('signup')}>Sign Up</button>
        </div>

        <div className="mt-6">
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          {signupSuccess && <div className="text-sm text-green-600 mb-2 p-2 bg-green-100 rounded">✓ Account created successfully! Redirecting to login...</div>}

          {tab === 'login' ? (
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300">&nbsp;</div>
                <a className="text-sm text-cyan-600 hover:underline">Forgot password?</a>
              </div>
              <div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600">{loading ? 'Signing in...' : 'Login'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
                <input type="email" value={semail} onChange={e => setSemail(e.target.value)} className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Phone Number</label>
                <div className="flex gap-2 mt-1 relative">
                  <div className="relative w-24">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full h-[48px] px-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 flex items-center justify-between text-sm"
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
                    className="flex-1 h-[48px] px-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                  <option value="patient">Patient</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input type="password" value={spassword} onChange={e => setSPassword(e.target.value)} className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
              </div>
              <div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600">{loading ? 'Creating...' : 'Create account'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
