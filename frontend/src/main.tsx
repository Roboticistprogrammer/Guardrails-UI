import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import { applyStoredTheme } from './theme.ts'
import App from './App.tsx'

applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
