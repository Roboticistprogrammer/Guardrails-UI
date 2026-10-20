import { useEffect, useState } from 'react'
import './PolicyViewer.css'

type Policy = { state: 'loading' } | { state: 'loaded'; content: string } | { state: 'error' }

export default function PolicyViewer() {
  const [policy, setPolicy] = useState<Policy>({ state: 'loading' })

  useEffect(() => {
    fetch('/api/policy')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ content?: unknown }>
      })
      .then(({ content }) => {
        if (typeof content !== 'string') throw new Error('Missing policy content')
        setPolicy({ state: 'loaded', content })
      })
      .catch(() => setPolicy({ state: 'error' }))
  }, [])

  return (
    <section className="card policy">
      <h2>Topic policy</h2>
      <p className="muted">
        The topic-control guidelines from <code>prompts.yml</code>. Read-only.
      </p>

      {policy.state === 'loading' && (
        <p className="status" role="status">
          Loading topic policy…
        </p>
      )}
      {policy.state === 'loaded' && policy.content.trim() === '' && (
        <p className="status" role="status">
          No topic policy is configured.
        </p>
      )}
      {policy.state === 'loaded' && policy.content.trim() !== '' && (
        <p className="policy-text">{policy.content}</p>
      )}
      {policy.state === 'error' && (
        <p className="error" role="alert">
          Couldn't load the topic policy. Check that the backend is running.
        </p>
      )}
    </section>
  )
}
