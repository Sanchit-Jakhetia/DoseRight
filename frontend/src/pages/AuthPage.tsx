import React, { useState } from 'react'
import { login as doLogin, signup as doSignup, saveToken } from '../lib/auth'

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
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'patient' | 'caretaker' | 'doctor' | 'admin'>('patient')
  const [spassword, setSPassword] = useState('')

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    try {
      const response = await doLogin({ email, password })
      saveToken(response.token)
      // Pass the full response with token and user
      onSuccess({ ...response.user, token: response.token })
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
      const response = await doSignup({ name, email: semail, phone, password: spassword, role })
      saveToken(response.token)
      // Pass the full response with token and user
      onSuccess({ ...response.user, token: response.token })
      setTab('login')
      if (onClose) onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Signup failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('/src/assets/pattern.png')] bg-[length:240px] dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.12 3.88a5 5 0 00-7.07 0L3.88 13.05a5 5 0 007.07 7.07L20.12 10.94a5 5 0 000-7.06z"/></svg>
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

          {tab === 'login' ? (
            <form onSubmit={submitLogin} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full mt-1 p-3 rounded-md border" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1 p-3 rounded-md border" />
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
                <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 rounded-md border" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
                <input type="email" value={semail} onChange={e => setSemail(e.target.value)} className="w-full mt-1 p-3 rounded-md border" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 p-3 rounded-md border" />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full mt-1 p-3 rounded-md border">
                  <option value="patient">Patient</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input type="password" value={spassword} onChange={e => setSPassword(e.target.value)} className="w-full mt-1 p-3 rounded-md border" />
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
