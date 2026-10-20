import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import './ChatPlayground.css'

type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; blocked: boolean }

// /api/chat rejects more than 50 messages, so only the most recent are sent.
const MAX_MESSAGES = 50

export default function ChatPlayground() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const inputId = useId()

  const text = draft.trim()
  const canSend = text !== '' && !pending

  function send() {
    if (!canSend) return
    const previous = messages
    const history: Message[] = [...previous, { role: 'user', content: text }]
    setMessages(history)
    setDraft('')
    setPending(true)

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history.slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content })),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ content: string; blocked: boolean }>
      })
      .then(({ content, blocked }) => {
        setMessages([...history, { role: 'assistant', content, blocked }])
        setFailed(false)
      })
      .catch(() => {
        setMessages(previous)
        setDraft(text)
        setFailed(true)
      })
      .finally(() => setPending(false))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send()
  }

  return (
    <section className="card chat">
      <h2>Chat playground</h2>

      <div className="chat-log" role="log" aria-label="Conversation">
        {messages.length === 0 ? (
          <p className="muted">No messages yet. Send one to see whether the topic rail allows it.</p>
        ) : (
          <ol className="chat-messages">
            {messages.map((message, index) => (
              <li key={index} className={`chat-message chat-message-${message.role}`}>
                <div className="chat-meta">
                  <span className="chat-author">{message.role === 'user' ? 'You' : 'Rail'}</span>
                  {message.role === 'assistant' && (
                    <span className={`chat-badge ${message.blocked ? 'chat-badge-blocked' : 'chat-badge-allowed'}`}>
                      {message.blocked ? 'Blocked' : 'Allowed'}
                    </span>
                  )}
                </div>
                <p className="chat-content">{message.content}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="chat-label" htmlFor={inputId}>
          Message
        </label>
        <textarea
          id={inputId}
          className="chat-input"
          rows={3}
          maxLength={4000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {failed && (
          <p className="error" role="alert">
            Couldn't get a reply from the backend. Try again.
          </p>
        )}
        <div className="chat-actions">
          <p className="status muted" role="status">
            {pending && 'Checking with the topic rail…'}
          </p>
          <button type="submit" className="chat-send" disabled={!canSend}>
            Send
          </button>
        </div>
      </form>
    </section>
  )
}
