import React, { useState } from 'react'
import { signup as doSignup, saveToken } from '../lib/auth'

type Props = {
  onClose?: () => void
  onSuccess: (user: any) => void
  isPage?: boolean
}

export default function Signup({ onClose, onSuccess, isPage }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'caretaker' | 'doctor' | 'admin'>('patient')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name || !email || !phone || !password) {
      setError('Please fill all fields')
      return
    }
    setLoading(true)
    try {
      const response = await doSignup({ name, email, phone, password, role })
      saveToken(response.token)
      onSuccess(response.user)
      if (onClose) onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Signup failed'))
    } finally { setLoading(false) }
  }

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
          <label className="text-xs text-slate-600 dark:text-slate-300">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 p-2 rounded-md border" />
        </div>
        <div>
          <label className="text-xs text-slate-600 dark:text-slate-300">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full mt-1 p-2 rounded-md border">
            <option value="patient">Patient</option>
            <option value="caretaker">Caretaker</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
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
