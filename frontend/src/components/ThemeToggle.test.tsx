import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import ThemeToggle from './ThemeToggle'

const KEY = 'guardrails-ui-theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Stubs matchMedia with a system preference the test can change later.
function mockSystem(dark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return dark
    },
    media: query,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  }))
  return (next: boolean) => {
    dark = next
    act(() => listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent)))
  }
}

function button(name: 'Light' | 'Dark') {
  return screen.getByRole('button', { name })
}

function expectPressed(name: 'Light' | 'Dark') {
  const other = name === 'Light' ? 'Dark' : 'Light'
  expect(button(name)).toHaveAttribute('aria-pressed', 'true')
  expect(button(other)).toHaveAttribute('aria-pressed', 'false')
}

test('renders a Theme group of two toggle buttons', () => {
  render(<ThemeToggle />)
  const group = screen.getByRole('group', { name: 'Theme' })
  expect(group).toContainElement(button('Light'))
  expect(group).toContainElement(button('Dark'))
  expect(button('Light')).toHaveAttribute('type', 'button')
  expect(button('Dark')).toHaveAttribute('type', 'button')
})

test('follows a light system with no stored choice', () => {
  mockSystem(false)
  render(<ThemeToggle />)
  expectPressed('Light')
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

test('follows a dark system with no stored choice', () => {
  mockSystem(true)
  render(<ThemeToggle />)
  expectPressed('Dark')
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

test('clicking Dark applies, stores and presses Dark', () => {
  mockSystem(false)
  render(<ThemeToggle />)
  fireEvent.click(button('Dark'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem(KEY)).toBe('dark')
  expectPressed('Dark')
})

test('clicking Light on a dark system applies, stores and presses Light', () => {
  mockSystem(true)
  render(<ThemeToggle />)
  fireEvent.click(button('Light'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(localStorage.getItem(KEY)).toBe('light')
  expectPressed('Light')
})

test('clicking the already pressed button still stores the choice', () => {
  mockSystem(true)
  render(<ThemeToggle />)
  fireEvent.click(button('Dark'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expect(localStorage.getItem(KEY)).toBe('dark')
  expectPressed('Dark')
})

test('a stored light choice wins over a dark system', () => {
  localStorage.setItem(KEY, 'light')
  mockSystem(true)
  render(<ThemeToggle />)
  expectPressed('Light')
})

test('a system change updates the pressed button when nothing is stored', () => {
  const setSystem = mockSystem(false)
  render(<ThemeToggle />)
  expectPressed('Light')
  setSystem(true)
  expectPressed('Dark')
  setSystem(false)
  expectPressed('Light')
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

test('a system change is ignored once a choice is stored', () => {
  const setSystem = mockSystem(false)
  render(<ThemeToggle />)
  fireEvent.click(button('Light'))
  setSystem(true)
  expectPressed('Light')
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
})

test('a system change is ignored when a choice was stored before load', () => {
  localStorage.setItem(KEY, 'dark')
  const setSystem = mockSystem(true)
  render(<ThemeToggle />)
  setSystem(false)
  expectPressed('Dark')
})

test('ignores an invalid stored value', () => {
  localStorage.setItem(KEY, 'purple')
  mockSystem(true)
  render(<ThemeToggle />)
  expectPressed('Dark')
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

test('still switches the theme when localStorage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage disabled')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage disabled')
  })
  mockSystem(false)
  render(<ThemeToggle />)
  expectPressed('Light')
  fireEvent.click(button('Dark'))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  expectPressed('Dark')
})
