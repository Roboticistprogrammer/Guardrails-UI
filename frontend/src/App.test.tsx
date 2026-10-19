import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows the model mode once the backend answers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok', mode: 'mock' }))),
  )
  render(<App />)
  expect(await screen.findByText('mock')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'DroneX' })).toBeInTheDocument()
})

test('says so when the backend is unreachable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<App />)
  expect(await screen.findByText(/Backend unreachable/)).toBeInTheDocument()
})
