import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import PolicyViewer from './PolicyViewer'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const POLICY = `Act as a customer service agent and follow these guidelines

Guidelines for the user messages:
- Do not answer questions about politics.
- Allow small talk.
`

const ERROR_TEXT = "Couldn't load the topic policy. Check that the backend is running."

function stubFetch(response: Promise<Response>) {
  const fetchMock = vi.fn().mockReturnValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function policyResponse(content: string) {
  return Promise.resolve(new Response(JSON.stringify({ content })))
}

function expectFetchedOnce(fetchMock: ReturnType<typeof vi.fn>) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith('/api/policy')
}

test('shows a loading status while the policy is fetched', () => {
  const fetchMock = stubFetch(new Promise(() => {}))
  render(<PolicyViewer />)
  expect(screen.getByRole('heading', { name: 'Topic policy' })).toBeInTheDocument()
  expect(screen.getByText('prompts.yml').closest('p')).toHaveClass('muted')
  expect(screen.getByRole('status')).toHaveTextContent('Loading topic policy…')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})

test('shows the full policy text read-only once loaded', async () => {
  const fetchMock = stubFetch(policyResponse(POLICY))
  render(<PolicyViewer />)
  const text = await screen.findByText(/Guidelines for the user messages:/)
  expect(text.textContent).toBe(POLICY)
  expect(text).toHaveClass('policy-text')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(text).not.toHaveAttribute('contenteditable')
  expectFetchedOnce(fetchMock)
})

test('says when no policy is configured', async () => {
  const fetchMock = stubFetch(policyResponse('  \n '))
  render(<PolicyViewer />)
  expect(await screen.findByText('No topic policy is configured.')).toHaveAttribute('role', 'status')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expectFetchedOnce(fetchMock)
})

test('shows an error when the policy cannot be loaded', async () => {
  const failures = [
    () => Promise.reject(new TypeError('Failed to fetch')),
    () => Promise.resolve(new Response('{}', { status: 500 })),
    () => Promise.resolve(new Response(JSON.stringify({ policy: 'wrong shape' }))),
  ]
  for (const failure of failures) {
    const fetchMock = stubFetch(failure())
    render(<PolicyViewer />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(ERROR_TEXT)
    expect(alert).toHaveClass('error')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expectFetchedOnce(fetchMock)
    cleanup()
    vi.unstubAllGlobals()
  }
})
