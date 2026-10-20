import { useState } from 'react'
import './LocalDeployment.css'

// Keep in step with "Running the TopicControl NIM locally" in README.md.
const STEPS = [
  { title: 'Set your NGC API key', command: 'export NGC_API_KEY=...' },
  {
    title: 'Choose a model cache folder',
    command: 'export LOCAL_NIM_CACHE=~/.cache/llama-nemotron-topic-guard',
  },
  {
    title: 'Create the cache folder',
    command: 'mkdir -p "$LOCAL_NIM_CACHE" && chmod 700 "$LOCAL_NIM_CACHE"',
  },
  {
    title: 'Start the NIM container',
    command: [
      'docker run -d --name llama-nemotron-topic-guard \\',
      '  --gpus=all --runtime=nvidia --shm-size=64GB \\',
      '  -e NGC_API_KEY -u "$(id -u)" \\',
      '  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache/" \\',
      '  -p 127.0.0.1:8123:8000 \\',
      '  nvcr.io/nim/nvidia/llama-3.1-nemoguard-8b-topic-control:1.10.1',
    ].join('\n'),
  },
  {
    title: 'Check that the NIM is ready',
    command: 'curl http://localhost:8123/v1/health/ready',
  },
]

export default function LocalDeployment() {
  const [copied, setCopied] = useState<number | null>(null)
  const [failed, setFailed] = useState<number | null>(null)

  async function copy(index: number) {
    try {
      await navigator.clipboard.writeText(STEPS[index].command)
      setCopied(index)
      setFailed(null)
    } catch {
      setCopied((previous) => (previous === index ? null : previous))
      setFailed(index)
    }
  }

  return (
    <section className="card local-deployment">
      <h2>Local deployment</h2>
      <p className="muted">
        Needs an NGC API key, Docker, the NVIDIA Container Toolkit and a supported GPU.
      </p>

      <ol className="deploy-list" aria-label="Deployment steps">
        {STEPS.map(({ title, command }, index) => {
          const label = copied === index ? 'Copied' : 'Copy'
          return (
            <li key={title} className="deploy-step">
              <div className="deploy-step-header">
                <h3 className="deploy-step-title">{title}</h3>
                <button
                  type="button"
                  className="deploy-copy"
                  aria-label={`${label} command: ${title}`}
                  onClick={() => copy(index)}
                >
                  {label}
                </button>
              </div>
              <pre className="deploy-command">
                <code>{command}</code>
              </pre>
              {failed === index && (
                <p className="error" role="alert">
                  Couldn't copy. Select the command and copy it by hand.
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <p>
        Then set <code>GUARDRAILS_MODE=local</code> in <code>.env</code>.
      </p>
    </section>
  )
}
