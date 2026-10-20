import { useEffect, useState } from 'react'
import ChatPlayground from './components/ChatPlayground'
import Logo from './components/Logo'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

type Health = { state: 'loading' } | { state: 'ok'; mode: string } | { state: 'error' }

export default function App() {
  const [health, setHealth] = useState<Health>({ state: 'loading' })

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ mode: string }>
      })
      .then(({ mode }) => setHealth({ state: 'ok', mode }))
      .catch(() => setHealth({ state: 'error' }))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <Logo />
        <div className="app-title">
          <span className="eyebrow">DroneX / Guardrails</span>
          <h1>Topic control</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-main">
        <section className="card">
          <h2>NemoGuard topic control</h2>
          <p className="muted">
            Test how the Llama 3.1 NemoGuard 8B TopicControl rail keeps a conversation on topic.
          </p>
          <p className="status" role="status">
            {health.state === 'loading' && 'Connecting to the backend…'}
            {health.state === 'ok' && (
              <>
                Backend connected · model mode <code>{health.mode}</code>
              </>
            )}
            {health.state === 'error' && (
              <span className="error">Backend unreachable. Start it with scripts/dev.sh.</span>
            )}
          </p>
        </section>

        <ChatPlayground />
      </main>
    </div>
  )
}
