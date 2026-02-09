import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_URL
  ?? (import.meta as any).env?.VITE_API_BASE_URL
  ?? 'http://localhost:8080'

export type SignupPayload = {
  name: string
  email: string
  phone: string
  password: string
  role: 'patient' | 'caretaker' | 'doctor' | 'admin'
}

export type LoginPayload = {
  email: string
  password: string
}

export type AuthResponse = {
  token: string
  user: {
    id: string
    name: string
    email: string
    phone: string
    role: string
  }
}
    
// NOTE: these are thin wrappers around REST endpoints. In future you can
// replace implementations with Firebase Auth calls (signInWithEmailAndPassword,
// createUserWithEmailAndPassword) while keeping the same call sites.

export async function signup(p: SignupPayload): Promise<AuthResponse> {
  // POST /api/auth/signup
  return axios.post(`${API_BASE}/api/auth/signup`, p).then(r => r.data)
}

export async function login(p: LoginPayload): Promise<AuthResponse> {
  // POST /api/auth/login
  return axios.post(`${API_BASE}/api/auth/login`, p).then(r => r.data)
}

export function saveToken(token: string) {
  localStorage.setItem('token', token)
}

export function getToken() {
  return localStorage.getItem('token')
}

export function clearToken() {
  localStorage.removeItem('token')
}

export function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default { signup, login, saveToken, getToken, clearToken, getAuthHeaders }
