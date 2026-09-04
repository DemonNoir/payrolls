# 🎨 UI/Design Conventions

> **Load this file when:** making any change to `css/style.css`, `index.html` layout, or any visual component. An agent that ignores these conventions will produce a result inconsistent with the rest of the app.

---

## Color Palette

The app uses a **Raycast-inspired deep dark aesthetic** with Apple system warm colors.

| Role | Value | Notes |
| :--- | :--- | :--- |
| Background | `#1c1c1e` | Deepest dark — Apple systemBackground |
| Surface (card) | `#2c2c2e` | One step lighter |
| Surface elevated | `#3a3a3c` | Modals, popovers |
| Text primary | `#f5f5f7` | Off-white — never use `#ffffff` |
| Text secondary | `rgba(255,255,255,0.55)` | Subdued labels, captions |
| Accent | Warm amber / orange-tinted | OT highlights, primary CTAs |
| Danger | `#ff453a` | Apple red — negative values, destructive actions |
| Success | `#30d158` | Apple green — positive values, confirmations |
| Separator | `rgba(255,255,255,0.08)` | Dividers between list items |

- ❌ Do NOT use named web colors (`red`, `blue`, `green`)
- ❌ Do NOT use `#ffffff` or `white` in dark-mode contexts
- ✅ Use `rgba()` for tinted overlays and glassmorphism effects

---

## Component Style

| Element | Style rules |
| :--- | :--- |
| Cards | `border-radius: 12px–16px`, subtle `box-shadow`, `backdrop-filter: blur(20px)` for glass effect |
| Buttons (primary) | `border-radius: 10px`, accent fill, `font-weight: 600` |
| Buttons (destructive) | `border-radius: 10px`, danger color |
| Inputs / selects | Dark surface background, 1px light border, focus ring on `:focus-visible` |
| Modals | `border-radius: 20px`, elevated surface, soft drop shadow |
| Separators | `rgba(255,255,255,0.08)` — never use `#ccc` or `#eee` |

---

## Motion & Animation

Every interactive element must respond visually. **Bare DOM updates without any visual transition are not acceptable.**

| Interaction | Expected animation |
| :--- | :--- |
| Button tap / click | `transform: scale(0.96)` on `:active` |
| Modal open | Fade-in + slide-up (`translateY(20px → 0)`, `opacity 0 → 1`) |
| Modal close | Fade-out + slide-down |
| Number value change | CSS `transition` on the element, or a brief counter animation |
| New card / list item appear | Fade-in with slight staggered delay |
| Destructive confirm | Brief shake animation (`@keyframes shake`) |

- Default duration: `transition: all 0.2s ease`
- Always add `@media (prefers-reduced-motion: reduce)` to disable animations for accessibility

---

## Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- ❌ Do NOT load fonts from Google Fonts CDN or any external URL (offline-first violation)
- **Body text:** `15–16px`, weight `400`
- **Labels / captions:** `13px`, weight `400–500`, secondary color
- **Headings:** `18–22px`, weight `700`
- **Numeric values:** `font-variant-numeric: tabular-nums` for aligned columns

---

## Responsive / Mobile-First

- Design at **390px width** first; then adapt upward for tablet/desktop
- All tap targets: minimum `44 × 44px` (Apple HIG standard)
- Avoid hover-only interactions — mobile users have no hover state
- Modals must scroll **internally** (overflow: auto on modal body), not push the page
