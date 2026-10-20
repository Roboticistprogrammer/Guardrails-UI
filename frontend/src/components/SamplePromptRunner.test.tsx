import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { SAMPLE_PROMPTS } from '../samplePrompts'
import SamplePromptRunner from './SamplePromptRunner'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function reply(blocked: boolean) {
  return new Response(JSON.stringify({ content: 'reply', blocked }))
}

function promptOf(init: RequestInit) {
  return JSON.parse(init.body as string).messages[0].content as string
}

// Answers each prompt with its expected verdict unless `answer` returns a response first.
function stubVerdicts(answer: (index: number) => Promise<Response> | undefined = () => undefined) {
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    const index = SAMPLE_PROMPTS.findIndex(({ prompt }) => prompt === promptOf(init))
    return answer(index) ?? Promise.resolve(reply(SAMPLE_PROMPTS[index].expected === 'blocked'))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function items() {
  return within(screen.getByRole('list', { name: 'Sample prompts' })).getAllByRole('listitem')
}

function runButton() {
  return screen.getByRole('button', { name: 'Run all' })
}

function expectedLabel(index: number) {
  return SAMPLE_PROMPTS[index].expected === 'blocked' ? 'Blocked' : 'Allowed'
}

test('lists every prompt as not run and does not fetch on mount', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<SamplePromptRunner />)
  expect(screen.getByRole('heading', { name: 'Sample prompts' })).toBeInTheDocument()
  expect(items()).toHaveLength(SAMPLE_PROMPTS.length)
  items().forEach((item, index) => {
    expect(within(item).getByText(SAMPLE_PROMPTS[index].prompt)).toBeInTheDocument()
    expect(within(item).getByText(`Expected: ${expectedLabel(index)}`)).toBeInTheDocument()
    expect(within(item).getByText('Not run')).toBeInTheDocument()
    expect(within(item).queryByText(/^Got:/)).not.toBeInTheDocument()
  })
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  expect(runButton()).not.toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('shows the running state and ignores a second click while running', () => {
  const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())
  expect(screen.getByRole('status')).toHaveTextContent('Running sample prompts…')
  expect(runButton()).toHaveAttribute('aria-disabled', 'true')
  items().forEach((item) => expect(within(item).getByText('Running…')).toBeInTheDocument())
  expect(fetchMock).toHaveBeenCalledTimes(1)

  fireEvent.click(runButton())
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('marks every prompt as passing when each verdict matches', async () => {
  stubVerdicts()
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())
  expect(await screen.findByText('6 of 6 passed')).toBeInTheDocument()
  items().forEach((item, index) => {
    expect(within(item).getByText('Pass')).toBeInTheDocument()
    expect(within(item).getByText(`Got: ${expectedLabel(index)}`)).toBeInTheDocument()
  })
  expect(runButton()).not.toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('marks a prompt as failing when its verdict differs', async () => {
  stubVerdicts((index) => (index === 4 ? Promise.resolve(reply(false)) : undefined))
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())
  expect(await screen.findByText('5 of 6 passed')).toBeInTheDocument()
  items().forEach((item, index) => {
    if (index === 4) {
      expect(within(item).getByText('Fail')).toBeInTheDocument()
      expect(within(item).getByText('Got: Allowed')).toBeInTheDocument()
      expect(within(item).getByText('Expected: Blocked')).toBeInTheDocument()
    } else {
      expect(within(item).getByText('Pass')).toBeInTheDocument()
    }
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('marks failed requests as errors and keeps running the rest', async () => {
  const fetchMock = stubVerdicts((index) => {
    if (index === 1) return Promise.reject(new TypeError('Failed to fetch'))
    if (index === 3) return Promise.resolve(new Response('{}', { status: 500 }))
    return undefined
  })
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())
  expect(await screen.findByText('4 of 6 passed')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(SAMPLE_PROMPTS.length)
  items().forEach((item, index) => {
    if (index === 1 || index === 3) {
      expect(within(item).getByText('Error')).toBeInTheDocument()
      expect(within(item).queryByText(/^Got:/)).not.toBeInTheDocument()
    } else {
      expect(within(item).getByText('Pass')).toBeInTheDocument()
      expect(within(item).getByText(`Got: ${expectedLabel(index)}`)).toBeInTheDocument()
    }
  })
  expect(screen.getByRole('alert')).toHaveTextContent(
    "Couldn't reach the backend for some prompts. Check that it is running and try again.",
  )
  expect(screen.getByRole('alert')).toHaveClass('error')
})

test('sends one single-message request per prompt, in order, one at a time', async () => {
  const settle: ((response: Response) => void)[] = []
  const fetchMock = vi.fn(() => new Promise<Response>((resolve) => settle.push(resolve)))
  vi.stubGlobal('fetch', fetchMock)
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())

  for (const [index, { prompt, expected }] of SAMPLE_PROMPTS.entries()) {
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(index + 1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).toHaveBeenCalledTimes(index + 1)

    const [url, init] = fetchMock.mock.calls[index] as unknown as [string, RequestInit]
    expect(url).toBe('/api/chat')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      messages: [{ role: 'user', content: prompt }],
    })
    settle[index](reply(expected === 'blocked'))
  }

  expect(await screen.findByText('6 of 6 passed')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(SAMPLE_PROMPTS.length)
})

test('clears the alert and earlier results when running again', async () => {
  let run = 1
  let releaseSecondRun: () => void = () => {}
  const secondRunGate = new Promise<void>((resolve) => (releaseSecondRun = resolve))
  stubVerdicts((index) => {
    if (run === 1 && index === 0) return Promise.reject(new TypeError('Failed to fetch'))
    if (run === 2 && index === 0) return secondRunGate.then(() => reply(false))
    return undefined
  })
  render(<SamplePromptRunner />)
  fireEvent.click(runButton())
  expect(await screen.findByText('5 of 6 passed')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toBeInTheDocument()

  run = 2
  fireEvent.click(runButton())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Running sample prompts…')
  items().forEach((item) => {
    expect(within(item).getByText('Running…')).toBeInTheDocument()
    expect(within(item).queryByText(/^Got:/)).not.toBeInTheDocument()
  })

  releaseSecondRun()
  expect(await screen.findByText('6 of 6 passed')).toBeInTheDocument()
  items().forEach((item, index) => {
    expect(within(item).getByText('Pass')).toBeInTheDocument()
    expect(within(item).getByText(`Got: ${expectedLabel(index)}`)).toBeInTheDocument()
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
