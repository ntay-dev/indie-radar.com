# IndieRadar Design System

Dark-mode analytics dashboard aesthetic. No light mode.

---

## 1. Brand Colors

| Token                | Value                   | Usage                                       |
| -------------------- | ----------------------- | ------------------------------------------- |
| `--color-brand`      | `#10b981` (Emerald 500) | Primary brand, CTA buttons, gradient source |
| `--color-brand-dark` | `#059669` (Emerald 600) | Hover state for brand buttons               |
| `--color-primary`    | `#10b981`               | Tailwind + shadcn primary alias             |

### Surface Hierarchy

| Token                      | Value     | Usage                                 |
| -------------------------- | --------- | ------------------------------------- |
| `--color-bg`               | `#0a0a0f` | Page background                       |
| `--color-surface`          | `#12121a` | Cards, nav, footer                    |
| `--color-surface-elevated` | `#1a1a26` | Nested containers, badges, avatar bgs |
| `--color-surface-hover`    | `#242430` | Hover states on surfaces              |

### Text Hierarchy

| Token                    | Value     | Usage                      |
| ------------------------ | --------- | -------------------------- |
| `--color-text-primary`   | `#f0f0f5` | Headings, important text   |
| `--color-text-secondary` | `#a0a0b5` | Body text, descriptions    |
| `--color-text-muted`     | `#65657a` | Labels, captions, metadata |

### Accent Colors (Data Visualization)

| Token                   | Value     | Usage                                |
| ----------------------- | --------- | ------------------------------------ |
| `--color-accent-green`  | `#22c55e` | Revenue, MRR values                  |
| `--color-accent-red`    | `#ef4444` | Errors, destructive actions          |
| `--color-accent-blue`   | `#3b82f6` | External links, interactive elements |
| `--color-accent-purple` | `#8b5cf6` | Rankings, special metrics            |
| `--color-accent-amber`  | `#f59e0b` | Warnings, medium trust badges        |

### Semantic Colors

| Context              | Color             | Token/Class                          |
| -------------------- | ----------------- | ------------------------------------ |
| Success / Revenue    | Emerald/Green 400 | `text-emerald-400`, `text-green-400` |
| Error / Destructive  | Red 400           | `text-red-400`                       |
| Warning / Stale data | Orange/Amber 400  | `text-orange-400`, `text-amber-400`  |
| External links       | Blue 400          | `text-blue-400`                      |
| Rankings             | Purple 400        | `text-purple-400`                    |

### shadcn CSS Variables (Dark Theme)

All shadcn `--primary` and `--ring` variables use emerald (`160 84% 39%`), not blue. Blue accent is available as `--color-accent-blue` for links and interactive affordances like external link icons.

---

## 2. Typography

- **Font Family:** Inter (via `--font-family-sans`)
- **Smoothing:** `-webkit-font-smoothing: antialiased`

### Heading Sizes

| Element            | Classes                                                     |
| ------------------ | ----------------------------------------------------------- |
| Page title (h1)    | `text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl` |
| Section title (h2) | `text-lg font-semibold`                                     |
| Card title (h3)    | `text-sm font-semibold`                                     |
| Label              | `text-xs font-medium uppercase tracking-wider`              |

### Weights

- **Bold (700):** Headings, stat values
- **Semibold (600):** Section titles, MRR values, card titles
- **Medium (500):** Nav links, buttons, labels
- **Normal (400):** Body text, descriptions

### Gradient Text Effect

```css
.gradient-text {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Used for hero headlines and page title accents (emerald to cyan gradient).

---

## 3. Spacing

| Element                  | Value                  |
| ------------------------ | ---------------------- |
| Container max width      | `max-w-7xl`            |
| Page horizontal padding  | `px-4 sm:px-6 lg:px-8` |
| Section vertical padding | `py-8` to `py-12`      |
| Card padding             | `p-4` to `p-6`         |
| Grid gap                 | `gap-3` to `gap-6`     |

### Grid Patterns

- **Stat cards:** `grid grid-cols-2 gap-4 sm:grid-cols-4`
- **Product cards:** `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`
- **Recently added:** `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`
- **Main layout:** `grid grid-cols-1 gap-6 lg:grid-cols-3` (2/3 + 1/3 sidebar)

---

## 4. Border Radius

| Element        | Radius                               | Class          |
| -------------- | ------------------------------------ | -------------- |
| Cards          | 12px                                 | `rounded-xl`   |
| Buttons        | 8px                                  | `rounded-lg`   |
| Logo icons     | 8px                                  | `rounded-lg`   |
| Badges / Pills | 9999px                               | `rounded-full` |
| Progress bars  | 6px / `rounded-md` to `rounded-full` |
| Avatars        | 9999px                               | `rounded-full` |

---

## 5. Shadows

### Card Hover Shadow

```
hover:shadow-lg hover:shadow-black/20
```

### Logo Glow

```
shadow-lg shadow-emerald-500/25
```

Used on the IndieRadar logo icon.

### Stat Card Glow Effects

Defined via CSS classes `.stat-green`, `.stat-blue`, `.stat-purple`, `.stat-amber`:

```css
.stat-green {
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.08),
    rgba(34, 197, 94, 0.02)
  );
  border-color: rgba(34, 197, 94, 0.15);
}
```

Each stat variant uses a subtle gradient background + tinted border for a colored glow effect.

---

## 6. Component Patterns

### Buttons

| Variant                 | Style                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary CTA             | `bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-5 py-2.5`                                                                                            |
| Secondary / Outline     | `border border-(--color-border) bg-(--color-surface-elevated) text-(--color-text-secondary) hover:border-(--color-border-hover) hover:text-(--color-text-primary)` |
| Ghost                   | `hover:bg-white/5 hover:text-(--color-text-primary)`                                                                                                               |
| shadcn Button (default) | Uses `--primary` (emerald) via cva variants                                                                                                                        |

### Cards

Standard card pattern:

```
rounded-xl border border-(--color-border) bg-(--color-surface) p-5
hover:border-(--color-border-hover) hover:shadow-lg hover:shadow-black/20
```

CSS utility classes `.card` and `.card-elevated` also available.

### Trust Badges

| Level          | Style                                                        |
| -------------- | ------------------------------------------------------------ |
| 80+ (Verified) | `bg-green-500/10 text-green-400 ring-1 ring-green-500/20`    |
| 50+ (Medium)   | `bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20`    |
| 20+ (Low)      | `bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20` |
| <20 (Unknown)  | `bg-white/5 text-(--color-text-muted) ring-1 ring-white/10`  |

### Navigation

- Sticky header with backdrop blur: `sticky top-0 z-50 bg-(--color-surface)/80 backdrop-blur-xl`
- Nav links: `text-(--color-text-secondary) hover:bg-white/5 hover:text-(--color-text-primary)`
- Active link: `!bg-white/10 !text-(--color-text-primary)`

### Stat Cards

Metric cards with colored glow variants:

```
rounded-xl border border-(--color-border) bg-(--color-surface) p-4
```

Add `.stat-green`, `.stat-blue`, `.stat-purple`, `.stat-amber` for colored glow.

### Fallback Avatars / Logo Placeholders

```
bg-emerald-500/10 text-emerald-400 ring-1 ring-white/5
```

Shows first letter of product/founder name with emerald brand tint.

---

## 7. Icons

**Library:** Lucide Vue Next (`lucide-vue-next`)

Standard icon sizes:

- Navigation / UI: `size-4` to `size-5`
- Small inline: `size-3` to `size-3.5`
- Empty states: `size-8` to `size-12`

---

## 8. Effects

### Backdrop Blur

Sticky navigation uses `backdrop-blur-xl` with semi-transparent surface background.

### Borders

Custom CSS variable borders using `rgba(255, 255, 255, 0.08)` for default, `rgba(255, 255, 255, 0.15)` for hover.

### Gradient Text

Emerald-to-cyan gradient applied to hero text via `.gradient-text` class.

### Skeleton Loading

Animated shimmer effect using surface colors:

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-elevated) 25%,
    var(--color-surface-hover) 50%,
    var(--color-surface-elevated) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
```

### Page Transitions

Fade + translateY on page navigation (respects `prefers-reduced-motion`).

---

## 9. Layout

- **Full-width** page with `max-w-7xl` centered container
- **Sticky header** with blur effect, border-b separator
- **Footer** with border-t separator, muted text
- **Hero sections** use `bg-(--color-surface)` with `border-b`
- **Content sections** use plain `bg-(--color-bg)` (page background)

---

## 10. Design Principles

1. **Dark-first, dark-only** — No light mode. All colors designed for dark backgrounds.
2. **Data-dense** — Analytics dashboard feel with stat cards, charts, and tables.
3. **Emerald brand** — `#10b981` as the consistent brand color throughout.
4. **Layered surfaces** — Three-level depth (bg, surface, elevated) creates visual hierarchy without shadows.
5. **Subtle glow effects** — Colored stat cards and hover states add life without being flashy.
6. **Source-verified trust** — Trust badges with color-coded levels (green/amber/orange) for data provenance.
7. **Tabular numbers** — All numeric data uses `tabular-nums` for alignment.
8. **Minimal interaction** — Hover reveals (border highlights, shadows) rather than complex animations.
