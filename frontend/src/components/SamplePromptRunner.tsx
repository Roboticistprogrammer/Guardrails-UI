import { useRef, useState } from 'react'
import { SAMPLE_PROMPTS } from '../samplePrompts'
import './SamplePromptRunner.css'

type Result =
  | { state: 'idle' | 'running' | 'error' }
  | { state: 'pass' | 'fail'; blocked: boolean }

const RESULT_LABELS: Record<Result['state'], string> = {
  idle: 'Not run',
  running: 'Running…',
  pass: 'Pass',
  fail: 'Fail',
  error: 'Error',
}

function outcome(blocked: boolean) {
  return blocked ? 'Blocked' : 'Allowed'
}

export default function SamplePromptRunner() {
  const [results, setResults] = useState<Result[]>(() =>
    SAMPLE_PROMPTS.map(() => ({ state: 'idle' })),
  )
  const [running, setRunning] = useState(false)
  // Guards against a second click landing before the re-render.
  const runningRef = useRef(false)

  const started = results.some((result) => result.state !== 'idle')
  const passed = results.filter((result) => result.state === 'pass').length
  const failedToReach = results.some((result) => result.state === 'error')

  async function runAll() {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    setResults(SAMPLE_PROMPTS.map(() => ({ state: 'running' })))

    for (const [index, { prompt, expected }] of SAMPLE_PROMPTS.entries()) {
      let result: Result
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { blocked } = (await res.json()) as { content: string; blocked: boolean }
        result = { state: blocked === (expected === 'blocked') ? 'pass' : 'fail', blocked }
      } catch {
        result = { state: 'error' }
      }
      setResults((previous) => previous.map((item, i) => (i === index ? result : item)))
    }

    runningRef.current = false
    setRunning(false)
  }

  return (
    <section className="card runner">
      <h2>Sample prompts</h2>
      <p className="muted">
        Run example prompts through the topic rail and check each against its expected outcome.
      </p>

      <ol className="runner-list" aria-label="Sample prompts">
        {SAMPLE_PROMPTS.map(({ prompt, expected }, index) => {
          const result = results[index]
          return (
            <li key={prompt} className="runner-item">
              <p className="runner-prompt">{prompt}</p>
              <div className="runner-meta">
                <span className="runner-outcome">Expected: {outcome(expected === 'blocked')}</span>
                {'blocked' in result && (
                  <span className="runner-outcome">Got: {outcome(result.blocked)}</span>
                )}
                <span className={`runner-badge runner-badge-${result.state}`}>
                  {RESULT_LABELS[result.state]}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {!running && failedToReach && (
        <p className="error" role="alert">
          Couldn't reach the backend for some prompts. Check that it is running and try again.
        </p>
      )}
      <div className="runner-actions">
        <p className="status muted" role="status">
          {running && 'Running sample prompts…'}
          {!running && started && `${passed} of ${SAMPLE_PROMPTS.length} passed`}
        </p>
        <button type="button" className="runner-run" aria-disabled={running} onClick={runAll}>
          Run all
        </button>
      </div>
    </section>
  )
}
