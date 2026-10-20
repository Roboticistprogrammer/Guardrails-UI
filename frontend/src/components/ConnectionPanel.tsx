import { useEffect, useState } from 'react'
import './ConnectionPanel.css'

type Nim = { url: string; ready: boolean }

type Connection =
  | { state: 'loading' }
  | { state: 'connected'; mode: string; nim: Nim | null }
  | { state: 'error' }

type ConnectionBody = { mode?: unknown; topic_control_url?: unknown; nim_ready?: unknown }

export default function ConnectionPanel() {
  const [connection, setConnection] = useState<Connection>({ state: 'loading' })

  useEffect(() => {
    fetch('/api/connection')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ConnectionBody>
      })
      .then(({ mode, topic_control_url, nim_ready }) => {
        if (typeof mode !== 'string') throw new Error('Missing model mode')
        const nim =
          typeof topic_control_url === 'string' && typeof nim_ready === 'boolean'
            ? { url: topic_control_url, ready: nim_ready }
            : null
        setConnection({ state: 'connected', mode, nim })
      })
      .catch(() => setConnection({ state: 'error' }))
  }, [])

  return (
    <section className="card connection">
      <h2>Connection</h2>

      {connection.state === 'loading' && (
        <p className="status" role="status">
          Connecting to the backend…
        </p>
      )}
      {connection.state === 'connected' && (
        <p className="status">
          Backend connected · model mode <code>{connection.mode}</code>
        </p>
      )}
      {connection.state === 'connected' && connection.nim && (
        <p className="status connection-nim">
          TopicControl NIM <code>{connection.nim.url}</code>{' '}
          {connection.nim.ready ? (
            <span className="connection-badge connection-badge-ready">Ready</span>
          ) : (
            <span className="connection-badge connection-badge-not-ready">Not ready</span>
          )}
        </p>
      )}
      {connection.state === 'connected' && connection.nim && !connection.nim.ready && (
        <p className="muted">
          No answer from /v1/health/ready. Start the NIM with the docker run in README.md, or wait for
          the model to finish loading.
        </p>
      )}
      {connection.state === 'error' && (
        <p className="error" role="alert">
          Backend unreachable. Start it with scripts/dev.sh.
        </p>
      )}
    </section>
  )
}
