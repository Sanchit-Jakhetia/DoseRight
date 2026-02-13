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

// Validation helpers
const validators = {
  email: (value: string): string | null => {
    if (!value.trim()) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Please enter a valid email address'
    return null
  },
  password: (value: string): string | null => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
    return null
  },
  name: (value: string): string | null => {
    if (!value.trim()) return 'Name is required'
    if (value.trim().length < 2) return 'Name must be at least 2 characters'
    if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) return 'Name can only contain letters, spaces, hyphens and apostrophes'
    return null
  },
  phone: (value: string): string | null => {
    if (!value.trim()) return 'Phone number is required'
    const digitsOnly = value.replace(/\D/g, '')
    if (digitsOnly.length < 7) return 'Phone number must be at least 7 digits'
    if (digitsOnly.length > 15) return 'Phone number cannot exceed 15 digits'
    if (!/^\d+$/.test(digitsOnly)) return 'Please enter a valid phone number'
    return null
  },
}

type FieldErrors = {
  email?: string | null
  password?: string | null
  name?: string | null
  phone?: string | null
}

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

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Validate a single field and update errors
  const validateField = (field: keyof typeof validators, value: string) => {
    const error = validators[field](value)
    setFieldErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  // Mark field as touched (for showing errors only after interaction)
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  // Validate login form
  const validateLoginForm = (): boolean => {
    const emailError = validators.email(email)
    const passwordError = password ? null : 'Password is required'
    
    setFieldErrors({ email: emailError, password: passwordError })
    setTouched({ email: true, password: true })
    
    return !emailError && !passwordError
  }

  // Validate signup form
  const validateSignupForm = (): boolean => {
    const nameError = validators.name(name)
    const emailError = validators.email(semail)
    const phoneError = validators.phone(phone)
    const passwordError = validators.password(spassword)
    
    setFieldErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
    })
    setTouched({ name: true, email: true, phone: true, password: true })
    
    return !nameError && !emailError && !phoneError && !passwordError
  }

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    
    if (!validateLoginForm()) return
    
    setLoading(true)
    try {
      const response = await doLogin({ email, password })
      saveToken(response.token)
      onSuccess({ ...response.user, token: response.token, isNewLogin: true })
      if (onClose) onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Login failed'))
    } finally { setLoading(false) }
  }

  const submitSignup = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    
    if (!validateSignupForm()) return
    
    setLoading(true)
    try {
      const fullPhone = `${countryCode}${phone}`
      const response = await doSignup({ name, email: semail, phone: fullPhone, password: spassword, role })
      saveToken(response.token)
      setSignupSuccess(true)
      setName('')
      setSemail('')
      setPhone('')
      setSPassword('')
      setFieldErrors({})
      setTouched({})
      setTimeout(() => {
        setSignupSuccess(false)
        setTab('login')
      }, 2000)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? (err?.message || 'Signup failed'))
    } finally { setLoading(false) }
  }

  // Helper component for field error display
  const FieldError = ({ error, touched: isTouched }: { error?: string | null, touched?: boolean }) => {
    if (!isTouched || !error) return null
    return <p className="text-xs text-red-500 mt-1">{error}</p>
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    
    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' }
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' }
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' }
    return { strength, label: 'Strong', color: 'bg-green-500' }
  }

  const passwordStrength = getPasswordStrength(spassword)

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
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value)
                    if (touched.email) validateField('email', e.target.value)
                  }}
                  onBlur={() => {
                    handleBlur('email')
                    validateField('email', email)
                  }}
                  placeholder="you@example.com" 
                  className={`w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    touched.email && fieldErrors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'dark:border-slate-600 focus:ring-cyan-500'
                  } focus:outline-none focus:ring-2`}
                />
                <FieldError error={fieldErrors.email} touched={touched.email} />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value)
                    if (touched.password && !e.target.value) {
                      setFieldErrors(prev => ({ ...prev, password: 'Password is required' }))
                    } else if (touched.password) {
                      setFieldErrors(prev => ({ ...prev, password: null }))
                    }
                  }}
                  onBlur={() => {
                    handleBlur('password')
                    if (!password) setFieldErrors(prev => ({ ...prev, password: 'Password is required' }))
                  }}
                  placeholder="••••••••" 
                  className={`w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    touched.password && fieldErrors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'dark:border-slate-600 focus:ring-cyan-500'
                  } focus:outline-none focus:ring-2`}
                />
                <FieldError error={fieldErrors.password} touched={touched.password} />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300">&nbsp;</div>
                <a className="text-sm text-cyan-600 hover:underline cursor-pointer">Forgot password?</a>
              </div>
              <div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 transition-opacity">{loading ? 'Signing in...' : 'Login'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Full name</label>
                <input 
                  value={name} 
                  onChange={e => {
                    setName(e.target.value)
                    if (touched.name) validateField('name', e.target.value)
                  }}
                  onBlur={() => {
                    handleBlur('name')
                    validateField('name', name)
                  }}
                  placeholder="John Doe"
                  className={`w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    touched.name && fieldErrors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'dark:border-slate-600 focus:ring-cyan-500'
                  } focus:outline-none focus:ring-2`}
                />
                <FieldError error={fieldErrors.name} touched={touched.name} />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Email</label>
                <input 
                  type="email" 
                  value={semail} 
                  onChange={e => {
                    setSemail(e.target.value)
                    if (touched.email) validateField('email', e.target.value)
                  }}
                  onBlur={() => {
                    handleBlur('email')
                    validateField('email', semail)
                  }}
                  placeholder="you@example.com"
                  className={`w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    touched.email && fieldErrors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'dark:border-slate-600 focus:ring-cyan-500'
                  } focus:outline-none focus:ring-2`}
                />
                <FieldError error={fieldErrors.email} touched={touched.email} />
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
                    onChange={e => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '')
                      setPhone(value)
                      if (touched.phone) validateField('phone', value)
                    }}
                    onBlur={() => {
                      handleBlur('phone')
                      validateField('phone', phone)
                    }}
                    placeholder="Phone number"
                    className={`flex-1 h-[48px] px-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                      touched.phone && fieldErrors.phone 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'dark:border-slate-600 focus:ring-cyan-500'
                    } focus:outline-none focus:ring-2`}
                  />
                </div>
                <FieldError error={fieldErrors.phone} touched={touched.phone} />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  <option value="patient">Patient</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">Password</label>
                <input 
                  type="password" 
                  value={spassword} 
                  onChange={e => {
                    setSPassword(e.target.value)
                    if (touched.password) validateField('password', e.target.value)
                  }}
                  onBlur={() => {
                    handleBlur('password')
                    validateField('password', spassword)
                  }}
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  className={`w-full mt-1 p-3 rounded-md border bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 ${
                    touched.password && fieldErrors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'dark:border-slate-600 focus:ring-cyan-500'
                  } focus:outline-none focus:ring-2`}
                />
                <FieldError error={fieldErrors.password} touched={touched.password} />
                
                {/* Password strength indicator */}
                {spassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div 
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            level <= passwordStrength.strength ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      passwordStrength.strength <= 2 ? 'text-red-500' :
                      passwordStrength.strength <= 3 ? 'text-yellow-600' :
                      passwordStrength.strength <= 4 ? 'text-blue-500' : 'text-green-500'
                    }`}>
                      Password strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 transition-opacity">{loading ? 'Creating...' : 'Create account'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
