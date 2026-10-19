# DroneX brand for Guardrails UI

Extracted from `DroneX Sub-brand Framework.html` v1.0 (kept out of git). This
app uses the **DroneX master brand**: the full master wordmark and the master
palette. It is not one of the sub-brand platforms (Migration Deck, WMS,
Aerobench), so it takes no platform accent.

## Files

| File | What it is |
| --- | --- |
| `tokens.css` | Every brand token (colour, type, spacing, radius, shadow, motion), verbatim. Raw values only; `frontend/src/theme.css` maps them to light and dark. |
| `logo/master-drone-mask.png` | Master wordmark: the D and "rone" layer. Alpha mask, 1161 × 954. |
| `logo/master-x-mask.png` | Master wordmark: the X layer. Same canvas, stack on top. |
| `logo/monogram-d-mask.png`, `logo/monogram-x-mask.png` | DX monogram layers, 1160 × 952. Sub-brand tag only; not used by this app. |
| `logo/master-preview.png` | Flat preview of the wordmark, for reading only. Never ship it. |

The masks are colourless. Render the logo by stacking both layers as CSS masks
and filling them, as `frontend/src/components/Logo.tsx` does.

## Rules for this app

1. **Logo colours.** D and "rone": `--logo-blue` on light surfaces, `--fog-100`
   on dark. X: `--logo-orange` on both. Never redraw, stretch, re-space, add
   effects or retypeset the lettering.
2. **Clear space and size.** Keep clear space on all sides equal to the D stem
   width (about 10% of the logo width). Minimum width is 120 px; below that,
   don't show the logo.
3. **Colour roles.** Primary actions and links use `--color-primary` (cyan
   `--color-primary-dark-accent` on dark). Signal orange (`--color-accent`) is
   the master accent; use it sparingly, never for errors. Errors and
   destructive actions use `--color-destructive`.
4. **Type.** Headings: `--font-display` with `font-stretch: 112%`, weight 700,
   `--tracking-tight`. Body: `--font-sans`. Labels, ids, code, model names and
   other machine values: `--font-mono`. Small uppercase labels use
   `--tracking-wide`.
5. **Surfaces.** Page background `--surface-panel`, cards `--surface-card` with
   a `--border-default` border and `--radius-md`. Spacing comes from the
   `--space-*` scale only.
6. **Both themes.** Every screen must work in light and dark. Use the semantic
   tokens (`--surface-*`, `--text-*`, `--border-default`, `--focus-ring`), which
   `theme.css` switches per theme. Never hard-code hex values in components.
7. **Focus.** Visible focus ring in `--focus-ring`, 2 px.

## Source notes

The lockups were recoloured from a master JPEG (1179 × 1079). Hex values may
be off by ±2 from compression. Replace the masks with vector artwork when it
exists.
