import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import LocalDeployment from './LocalDeployment'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const ERROR_TEXT = "Couldn't copy. Select the command and copy it by hand."

const DOCKER_RUN = `docker run -d --name llama-nemotron-topic-guard \\
  --gpus=all --runtime=nvidia --shm-size=64GB \\
  -e NGC_API_KEY -u "$(id -u)" \\
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache/" \\
  -p 8123:8000 \\
  nvcr.io/nim/nvidia/llama-3.1-nemoguard-8b-topic-control:1.10.1`

const STEPS = [
  ['Set your NGC API key', 'export NGC_API_KEY=...'],
  ['Choose a model cache folder', 'export LOCAL_NIM_CACHE=~/.cache/llama-nemotron-topic-guard'],
  ['Create the cache folder', 'mkdir -p "$LOCAL_NIM_CACHE" && chmod 700 "$LOCAL_NIM_CACHE"'],
  ['Start the NIM container', DOCKER_RUN],
  ['Check that the NIM is ready', 'curl http://localhost:8123/v1/health/ready'],
]

function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  return writeText
}

function copyButton(title: string) {
  return screen.getByRole('button', { name: new RegExp(`^Cop(y|ied) command: ${title}$`) })
}

function step(title: string) {
  return screen.getByRole('heading', { name: title }).closest('li') as HTMLElement
}

test('shows the prerequisites and the five commands with Copy buttons', () => {
  render(<LocalDeployment />)
  expect(screen.getByRole('heading', { level: 2, name: 'Local deployment' })).toBeInTheDocument()
  expect(
    screen.getByText('Needs an NGC API key, Docker, the NVIDIA Container Toolkit and a supported GPU.'),
  ).toHaveClass('muted')

  const items = within(screen.getByRole('list', { name: 'Deployment steps' })).getAllByRole('listitem')
  expect(items).toHaveLength(5)
  for (const [index, [title, command]] of STEPS.entries()) {
    const item = items[index]
    expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(title)
    const code = item.querySelector('pre > code')
    expect(code?.textContent).toBe(command)
    const button = within(item).getByRole('button', { name: `Copy command: ${title}` })
    expect(button).toHaveTextContent(/^Copy$/)
    expect(button).toHaveAttribute('type', 'button')
  }
  expect(screen.getAllByRole('button')).toHaveLength(5)
  expect(screen.getByText('GUARDRAILS_MODE=local').tagName).toBe('CODE')
  expect(screen.getByText('.env').closest('p')).toHaveTextContent('Then set GUARDRAILS_MODE=local in .env.')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('copies the exact command of each step', async () => {
  for (const [title, command] of STEPS) {
    const writeText = stubClipboard(vi.fn().mockResolvedValue(undefined))
    render(<LocalDeployment />)
    fireEvent.click(copyButton(title))
    const button = await screen.findByRole('button', { name: `Copied command: ${title}` })
    expect(button).toHaveTextContent(/^Copied$/)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(command)
    expect(screen.getAllByRole('button', { name: /^Copy command:/ })).toHaveLength(4)
    cleanup()
    vi.unstubAllGlobals()
  }
})

test('copies the multi-line docker run exactly as in README.md', async () => {
  const writeText = stubClipboard(vi.fn().mockResolvedValue(undefined))
  render(<LocalDeployment />)
  fireEvent.click(copyButton('Start the NIM container'))
  await screen.findByRole('button', { name: 'Copied command: Start the NIM container' })
  expect(writeText.mock.calls[0][0]).toBe(DOCKER_RUN)
  expect(DOCKER_RUN.split('\n')).toHaveLength(6)
})

test('moves Copied to the most recently copied step', async () => {
  stubClipboard(vi.fn().mockResolvedValue(undefined))
  render(<LocalDeployment />)
  fireEvent.click(copyButton('Set your NGC API key'))
  await screen.findByRole('button', { name: 'Copied command: Set your NGC API key' })

  fireEvent.click(copyButton('Check that the NIM is ready'))
  await screen.findByRole('button', { name: 'Copied command: Check that the NIM is ready' })
  expect(copyButton('Set your NGC API key')).toHaveAccessibleName('Copy command: Set your NGC API key')
  expect(copyButton('Set your NGC API key')).toHaveTextContent(/^Copy$/)
  expect(screen.getAllByText('Copied')).toHaveLength(1)
})

test('shows an error in the step when writeText rejects', async () => {
  const writeText = stubClipboard(vi.fn().mockRejectedValue(new Error('Not allowed')))
  render(<LocalDeployment />)
  fireEvent.click(copyButton('Create the cache folder'))
  const alert = await within(step('Create the cache folder')).findByRole('alert')
  expect(alert).toHaveTextContent(ERROR_TEXT)
  expect(alert).toHaveClass('error')
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(copyButton('Create the cache folder')).toHaveAccessibleName('Copy command: Create the cache folder')
  expect(copyButton('Create the cache folder')).toHaveTextContent(/^Copy$/)
  expect(writeText).toHaveBeenCalledWith('mkdir -p "$LOCAL_NIM_CACHE" && chmod 700 "$LOCAL_NIM_CACHE"')
})

test('shows an error in the step when the clipboard is unavailable', async () => {
  vi.stubGlobal('navigator', {})
  render(<LocalDeployment />)
  fireEvent.click(copyButton('Start the NIM container'))
  const alert = await within(step('Start the NIM container')).findByRole('alert')
  expect(alert).toHaveTextContent(ERROR_TEXT)
  expect(screen.getAllByRole('alert')).toHaveLength(1)
  expect(copyButton('Start the NIM container')).toHaveTextContent(/^Copy$/)
  expect(screen.queryByText('Copied')).not.toBeInTheDocument()
})

test('clears the error after a later successful copy', async () => {
  const writeText = stubClipboard(
    vi.fn().mockRejectedValueOnce(new Error('Not allowed')).mockResolvedValue(undefined),
  )
  render(<LocalDeployment />)
  fireEvent.click(copyButton('Set your NGC API key'))
  expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_TEXT)

  fireEvent.click(copyButton('Choose a model cache folder'))
  await screen.findByRole('button', { name: 'Copied command: Choose a model cache folder' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(copyButton('Set your NGC API key')).toHaveTextContent(/^Copy$/)
  expect(writeText).toHaveBeenCalledTimes(2)
})
