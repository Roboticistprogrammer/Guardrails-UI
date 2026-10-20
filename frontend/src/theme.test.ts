import { beforeEach, expect, test } from 'vitest'
import { applyStoredTheme } from './theme'

const KEY = 'guardrails-ui-theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

test('applies a stored dark choice at startup', () => {
  localStorage.setItem(KEY, 'dark')
  applyStoredTheme()
  expect(document.documentElement.dataset.theme).toBe('dark')
})

test('leaves data-theme unset when nothing is stored', () => {
  applyStoredTheme()
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})

test('leaves data-theme unset when the stored value is invalid', () => {
  localStorage.setItem(KEY, 'purple')
  applyStoredTheme()
  expect(document.documentElement).not.toHaveAttribute('data-theme')
})
