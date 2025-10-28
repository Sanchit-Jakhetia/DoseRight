import axios from 'axios'

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type SignupPayload = {
  name: string
  mobile: string
  patientId: string
  password: string
}

export type LoginPayload = {
  patientId: string
  password: string
}
    
// NOTE: these are thin wrappers around REST endpoints. In future you can
// replace implementations with Firebase Auth calls (signInWithEmailAndPassword,
// createUserWithEmailAndPassword) while keeping the same call sites.

export async function signup(p: SignupPayload) {
  // Example: POST /api/auth/signup
  return axios.post(`${API_BASE}/api/auth/signup`, p).then(r => r.data)
}

export async function login(p: LoginPayload) {
  // Example: POST /api/auth/login
  return axios.post(`${API_BASE}/api/auth/login`, p).then(r => r.data)
}

export default { signup, login }
