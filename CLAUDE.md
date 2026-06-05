# TradeViewer

## Tech Stack
- Frontend: React + TypeScript
- Styling: CSS Modules
- Backend: .NET / C#

## Component Conventions

### File placement
- Page-level components → `src/pages/` (`.tsx`)
- Page styles → `src/pages/css/` (e.g. `TradesPage.tsx` → `css/TradesPage.module.css`)
- Reusable UI components → `src/components/` with styles in `src/components/css/`
- Shared types → `src/types.ts`
- API helpers → `src/api/`

### Component structure
- Use functional components with named exports: `export function MyComponent()`
- Always define a Props interface above the component
- One component per file

### Naming
- Files: PascalCase (e.g. `UserCard.tsx`)
- Hooks: `use` prefix in `src/hooks/` (e.g. `useUserData.ts`)

## Code Standards
- Prefer `interface` over `type` for object shapes / props
- Use `const` arrow functions for handlers inside components
- Avoid default exports for components

## Frontend CSS Rules

### Always Use CSS Variables
Never use hardcoded color, spacing, or radius values. Always reference the CSS custom properties defined in `frontend/src/index.css`:

- Colors: `var(--bg)`, `var(--surface)`, `var(--surface2)`, `var(--border)`, `var(--text)`, `var(--text-muted)`, `var(--accent)`, `var(--accent-hover)`, `var(--green)`, `var(--red)`, `var(--yellow)`
- Border radius: `var(--radius)`

```css
/* Wrong */
.card { color: #8892a4; border-radius: 10px; }

/* Correct */
.card { color: var(--text-muted); border-radius: var(--radius); }
```

If a new design token is needed, define it in `:root` in `index.css` first, then reference it via `var(--name)`.

### CSS Modules
All component styles use CSS Modules. CSS files use the `.module.css` extension and live in `src/pages/css/`.

```tsx
// Import
import styles from './css/TradesPage.module.css'

// Local-only class
<div className={styles['trades-header']}>

// Global utility + local class
<button className={`btn btn-secondary ${styles['year-btn']}`}>

// Conditional BEM modifier
<button className={`${styles['period-btn']}${active ? ` ${styles['period-btn--active']}` : ''}`}>
```

Global utility classes (`btn`, `btn-primary`, `btn-secondary`, `badge`, `card`, etc.) are defined in `index.css` and used as plain strings — not through a CSS module.

### Component-Scoped Styles
Avoid inline `style={{ }}` props. Use CSS classes instead.

- Component styles go in `frontend/src/pages/css/` as `.module.css` files
- Before adding a new class, check if a global utility in `frontend/src/index.css` already covers it — prefer extending globals over adding component-specific rules
- Global/reset styles and reusable utilities belong in `frontend/src/index.css`

```tsx
// Wrong
<div style={{ color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>

// Correct
<div className={styles['card-meta']}>
```

```css
/* TradesPage.module.css */
.card-meta {
  color: var(--text-muted);
  display: flex;
  gap: 8px;
}
```
