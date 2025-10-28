import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize theme from localStorage (default: follow system or light)
const saved = localStorage.getItem('theme')
if (saved === 'dark') {
  document.documentElement.classList.add('dark')
} else if (saved === 'light') {
  document.documentElement.classList.remove('dark')
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
