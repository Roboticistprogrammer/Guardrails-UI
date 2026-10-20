export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'guardrails-ui-theme'

// Storage can throw when disabled; that counts as no stored choice.
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function saveTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The theme still applies to this page.
  }
}

// Runs before the first render so the stored theme is in place from the start.
export function applyStoredTheme() {
  const theme = readStoredTheme()
  if (theme) document.documentElement.dataset.theme = theme
}
