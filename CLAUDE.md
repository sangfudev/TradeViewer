# TradeViewer

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

### Component-Scoped Styles
Avoid inline `style={{ }}` props. Use CSS classes instead.

- Component-specific classes go in `frontend/src/pages/css/` (e.g. `TradesPage.css`) and are imported in the component as `'./css/TradesPage.css'`
- Do not use CSS modules or CSS-in-JS libraries
- Before adding a new class, check if a global utility in `frontend/src/index.css` already covers it — prefer extending globals over adding component-specific rules
- Global/reset styles and reusable utilities belong in `frontend/src/index.css`

```jsx
// Wrong
<div style={{ color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>

// Correct
<div className="card-meta">
```

```css
/* TradesPage.css */
.card-meta {
  color: var(--text-muted);
  display: flex;
  gap: 8px;
}
```
