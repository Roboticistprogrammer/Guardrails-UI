import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import ChatPlayground from './ChatPlayground'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function reply(content: string, blocked: boolean) {
  return new Response(JSON.stringify({ content, blocked }))
}

function send(text: string) {
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

function sentMessages(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  const init = fetchMock.mock.calls[call][1] as RequestInit
  return JSON.parse(init.body as string).messages
}

test('shows the empty state and does not fetch on mount', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  expect(
    screen.getByText('No messages yet. Send one to see whether the topic rail allows it.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('shows the loading text and disables Send while a request is in flight', () => {
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
  render(<ChatPlayground />)
  send('  Hello there  ')
  expect(screen.getByText('Checking with the topic rail…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  expect(screen.getByLabelText('Message')).toHaveValue('')
  expect(within(screen.getByRole('log')).getByText('Hello there')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Next one' } })
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
})

test('marks an on-topic reply as Allowed', async () => {
  const fetchMock = vi.fn().mockResolvedValue(reply('[mock] On topic. You said: Hi', false))
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  send('Hi')
  const log = screen.getByRole('log')
  expect(await within(log).findByText('[mock] On topic. You said: Hi')).toBeInTheDocument()
  expect(within(log).getByText('Allowed')).toBeInTheDocument()
  expect(within(log).queryByText('Blocked')).not.toBeInTheDocument()
  expect(within(log).getByText('You')).toBeInTheDocument()
  expect(within(log).getByText('Rail')).toBeInTheDocument()
  expect(screen.queryByText('Checking with the topic rail…')).not.toBeInTheDocument()

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toBe('/api/chat')
  expect(init.method).toBe('POST')
  expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
})

test('marks an off-topic reply as Blocked', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(reply("I'm sorry, I can't respond to that.", true)),
  )
  render(<ChatPlayground />)
  send('Which party should I vote for?')
  const log = screen.getByRole('log')
  expect(await within(log).findByText("I'm sorry, I can't respond to that.")).toBeInTheDocument()
  expect(within(log).getByText('Blocked')).toBeInTheDocument()
  expect(within(log).queryByText('Allowed')).not.toBeInTheDocument()
})

test('sends the full prior conversation with each new message', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(reply('[mock] On topic. You said: First', false))
    .mockResolvedValueOnce(reply('[mock] On topic. You said: Second', false))
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  send('First')
  await screen.findByText('[mock] On topic. You said: First')
  send('Second')
  await screen.findByText('[mock] On topic. You said: Second')

  expect(sentMessages(fetchMock, 1)).toEqual([
    { role: 'user', content: 'First' },
    { role: 'assistant', content: '[mock] On topic. You said: First' },
    { role: 'user', content: 'Second' },
  ])
})

test('sends only the most recent 50 messages', async () => {
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    const { messages } = JSON.parse(init.body as string)
    return Promise.resolve(reply(`Reply ${messages.at(-1).content}`, false))
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  for (let turn = 1; turn <= 26; turn++) {
    send(`Turn ${turn}`)
    await screen.findByText(`Reply Turn ${turn}`)
  }

  const messages = sentMessages(fetchMock, 25)
  expect(messages).toHaveLength(50)
  expect(messages[0]).toEqual({ role: 'assistant', content: 'Reply Turn 1' })
  expect(messages[49]).toEqual({ role: 'user', content: 'Turn 26' })
})

test('restores the text and shows an alert when the request fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<ChatPlayground />)
  send('Will this work?')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't get a reply from the backend. Try again.",
  )
  expect(screen.getByLabelText('Message')).toHaveValue('Will this work?')
  expect(within(screen.getByRole('log')).queryByText('Will this work?')).not.toBeInTheDocument()
  expect(
    screen.getByText('No messages yet. Send one to see whether the topic rail allows it.'),
  ).toBeInTheDocument()
})

test('treats a non-2xx response as an error and clears the alert on the next success', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 422 }))
      .mockResolvedValueOnce(reply('[mock] On topic. You said: Retry', false)),
  )
  render(<ChatPlayground />)
  send('Retry')
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.getByLabelText('Message')).toHaveValue('Retry')

  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(await screen.findByText('[mock] On topic. You said: Retry')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('sends on Enter but not on Shift+Enter', async () => {
  const fetchMock = vi.fn().mockResolvedValue(reply('[mock] On topic. You said: Hi', false))
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  const input = screen.getByLabelText('Message')
  fireEvent.change(input, { target: { value: 'Hi' } })

  fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
  expect(fetchMock).not.toHaveBeenCalled()
  expect(input).toHaveValue('Hi')

  fireEvent.keyDown(input, { key: 'Enter' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(input).toHaveValue('')
  expect(await screen.findByText('[mock] On topic. You said: Hi')).toBeInTheDocument()
})

test('does not send whitespace-only text', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<ChatPlayground />)
  const input = screen.getByLabelText('Message')
  fireEvent.change(input, { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  fireEvent.keyDown(input, { key: 'Enter' })
  fireEvent.submit(input.closest('form')!)
  expect(fetchMock).not.toHaveBeenCalled()
})
