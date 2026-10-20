import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import ConnectionPanel from './ConnectionPanel'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const ERROR_TEXT = 'Backend unreachable. Start it with scripts/dev.sh.'
const HINT =
  'No answer from /v1/health/ready. Start the NIM with the docker run in README.md, or wait for the model to finish loading.'
const NIM_URL = 'http://localhost:8123/v1'

function stubFetch(response: Promise<Response>) {
  const fetchMock = vi.fn().mockReturnValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function connectionResponse(body: object) {
  return Promise.resolve(new Response(JSON.stringify(body)))
}

function expectFetchedOnce(fetchMock: ReturnType<typeof vi.fn>) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('/api/connection')
}

test('shows a loading status while the connection is checked', () => {
  const fetchMock = stubFetch(new Promise(() => {}))
  render(<ConnectionPanel />)
  expect(screen.getByRole('heading', { name: 'Connection' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Connecting to the backend…')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})

test('says the backend is unreachable when the connection cannot be loaded', async () => {
  const failures = [
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => Promise.resolve(new Response('{}', { status: 502 })),
    () => connectionResponse({ status: 'ok' }),
  ]
  for (const failure of failures) {
    const fetchMock = stubFetch(failure())
    render(<ConnectionPanel />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(ERROR_TEXT)
    expect(alert).toHaveClass('error')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend connected', { exact: false })).not.toBeInTheDocument()
    expectFetchedOnce(fetchMock)
    cleanup()
    vi.unstubAllGlobals()
  }
})

test('shows the model mode and nothing about the NIM in mock mode', async () => {
  const fetchMock = stubFetch(connectionResponse({ mode: 'mock', topic_control_url: null, nim_ready: null }))
  render(<ConnectionPanel />)
  const mode = await screen.findByText('mock')
  expect(mode.tagName).toBe('CODE')
  expect(mode.closest('p')).toHaveTextContent('Backend connected · model mode mock')
  expect(screen.queryByText(/Ready/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/NIM/)).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})

test('shows the NIM URL with a Ready badge when the local NIM is ready', async () => {
  const fetchMock = stubFetch(
    connectionResponse({ mode: 'local', topic_control_url: NIM_URL, nim_ready: true }),
  )
  render(<ConnectionPanel />)
  const url = await screen.findByText(NIM_URL)
  expect(url.tagName).toBe('CODE')
  expect(screen.getByText('local').tagName).toBe('CODE')
  const badge = screen.getByText('Ready')
  expect(badge).toHaveClass('connection-badge', 'connection-badge-ready')
  expect(url.closest('p')).toContainElement(badge)
  expect(screen.queryByText('Not ready')).not.toBeInTheDocument()
  expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})

test('shows a Not ready badge and the README hint when the local NIM is not ready', async () => {
  const fetchMock = stubFetch(
    connectionResponse({ mode: 'local', topic_control_url: NIM_URL, nim_ready: false }),
  )
  render(<ConnectionPanel />)
  const badge = await screen.findByText('Not ready')
  expect(badge).toHaveClass('connection-badge', 'connection-badge-not-ready')
  expect(screen.getByText(NIM_URL).closest('p')).toContainElement(badge)
  expect(screen.queryByText('Ready')).not.toBeInTheDocument()
  expect(screen.getByText(HINT)).toHaveClass('muted')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})
