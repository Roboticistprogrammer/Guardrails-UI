import { useEffect, useState } from 'react'
import { readStoredTheme, saveTheme, type Theme } from '../theme'
import './ThemeToggle.css'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const OPTIONS: { theme: Theme; label: string }[] = [
  { theme: 'light', label: 'Light' },
  { theme: 'dark', label: 'Dark' },
]

export default function ThemeToggle() {
  const [chosen, setChosen] = useState<Theme | null>(readStoredTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const active = chosen ?? (systemDark ? 'dark' : 'light')

  function choose(theme: Theme) {
    saveTheme(theme)
    setChosen(theme)
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map(({ theme, label }) => (
        <button
          key={theme}
          type="button"
          className="theme-toggle-option"
          aria-pressed={active === theme}
          onClick={() => choose(theme)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
