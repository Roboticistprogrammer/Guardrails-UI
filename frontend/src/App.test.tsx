import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const RESPONSES: Record<string, object> = {
  '/api/connection': { mode: 'mock', topic_control_url: null, nim_ready: null },
  '/api/policy': { content: 'Guidelines for the user messages:' },
}

test('shows the model mode once the backend answers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(RESPONSES[url])))),
  )
  render(<App />)
  expect(await screen.findByText('mock')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'DroneX' })).toBeInTheDocument()
  expect(await screen.findByText('Guidelines for the user messages:')).toBeInTheDocument()
})

test('says so when the backend is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<App />)
  expect(await screen.findByText(/Backend unreachable/)).toBeInTheDocument()
  expect(await screen.findByText(/Couldn't load the topic policy/)).toBeInTheDocument()
})
