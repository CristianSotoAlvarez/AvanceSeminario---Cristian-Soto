# DispatchTrack — Design System & Frontend Architecture Spec

## 1. Overview

**DispatchTrack** is a real-time logistics traceability platform for Agrosuper S.A.'s dispatch area (3 buildings, 11 docks). This spec defines the visual design system and frontend architecture decisions validated during brainstorming.

**Stack:** Next.js 15 + TailwindCSS v4 + shadcn/ui + Framer Motion + ECharts + Socket.io (client)
**Monorepo:** Turborepo with shared `packages/types`, `packages/utils`, and `packages/ui` (shared design system components)

**Visual references:** See `.superpowers/brainstorm/` for interactive HTML prototypes of all components.

---

## 2. Color Tokens

### Base Palette

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--bg-primary` | `#151419` | 21,20,25 | App background |
| `--bg-surface` | `#1B1B1E` | 27,27,30 | Cards, sidebar, modals |
| `--bg-elevated` | `#262626` | 38,38,38 | Table headers, inputs, hover states |
| `--text-primary` | `#FBFBFB` | 251,251,251 | Primary text |
| `--text-muted` | `#9A9A9A` | 154,154,154 | Labels, secondary text (adjusted for WCAG AA 4.5:1 on surface) |
| `--accent` | `#F56E0F` | 245,110,15 | Primary buttons, active elements, links |

### Semantic Colors (desaturated, integrated with dark theme)

Badge backgrounds and borders are derived programmatically from the base hex using a utility function (`colorWithOpacity(hex, bgOpacity, borderOpacity)`) rather than hardcoded rgba values.

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#7AB87A` | Listo, Aprobado SAG, Despachado |
| `--error` | `#D4807A` | Rechazado SAG, Bloqueado |
| `--warning` | `#B8A860` | Asignado, Esperando SAG |
| `--info` | `#6896C8` | En Portería, En Túnel Frío |
| `--active` | `#F56E0F` | En Carga, action in progress |
| `--neutral` | `#9A9A9A` | Esperado, inactive |

**Badge pattern:** Background = base color at 12% opacity. Border = base color at 25% opacity. Text = full base color.

### State-to-Color Mapping

| Truck State | Color Token |
|---|---|
| `ESPERADO` | `--neutral` |
| `EN_PORTERIA` | `--info` |
| `ASIGNADO` | `--warning` |
| `EN_CARGA` | `--active` |
| `EN_TUNEL_FRIO` | `--info` |
| `ESPERANDO_SAG` | `--warning` |
| `APROBADO_SAG` | `--success` |
| `RECHAZADO_SAG` | `--error` |
| `LISTO` | `--success` |
| `DESPACHADO` | `--success` |

---

## 3. Spacing System

Base-4 scale. All spacing values derive from multiples of 4px.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight gaps (icon-text in small buttons) |
| `--space-2` | 8px | Default gaps between inline elements |
| `--space-3` | 12px | Padding in small components, sidebar item icon-label gap |
| `--space-4` | 16px | Component padding (sidebar items, card internal), gaps between cards |
| `--space-5` | 20px | Section margins |
| `--space-6` | 24px | Large component padding (modals, page sections) |
| `--space-8` | 32px | Section separators |
| `--space-10` | 40px | Page-level vertical rhythm |

---

## 4. Typography

### Fonts

| Font | Source | Role |
|---|---|---|
| **Oswald** | Google Fonts | Headings, labels, buttons, navigation, table headers, body/descriptive text |
| **Sono** | Google Fonts | KPIs, numbers, truck plates, codes, badges, table data cells, timestamps |

### Type Scale

| Element | Font | Weight | Size | Style |
|---|---|---|---|---|
| H1 | Oswald | 700 | 28px | Uppercase, letter-spacing 1px |
| H2 | Oswald | 600 | 20px | Uppercase, letter-spacing 0.8px |
| H3 | Oswald | 500 | 16px | Uppercase, letter-spacing 0.5px |
| Body | Oswald | 400 | 13px | Normal case |
| Label | Oswald | 400 | 11px | Uppercase, letter-spacing 0.8px |
| Caption | Oswald | 300 | 11px | Normal case, `--text-muted` |
| Table header | Oswald | 500 | 10px | Uppercase, letter-spacing 0.8px |
| KPI card value | Sono | 700 | 36px | — |
| KPI inline value | Sono | 700 | 32px | — |
| Table data | Sono | 400 | 12px | — |
| Code/plate | Sono | 600 | 12px | — |
| Badge text | Sono | 600 | 11px | — |
| Button small | Oswald | 500 | 11px | Uppercase, letter-spacing 0.5px |
| Button medium | Oswald | 500 | 12px | Uppercase, letter-spacing 0.8px |
| Button large | Oswald | 500 | 14px | Uppercase, letter-spacing 1px |

---

## 5. Z-Index Layers

| Token | Value | Usage |
|---|---|---|
| `--z-base` | 0 | Page content |
| `--z-sidebar` | 10 | Sidebar navigation |
| `--z-header` | 20 | Top header bar |
| `--z-dropdown` | 30 | Dropdowns, selects, popovers |
| `--z-tooltip` | 40 | Tooltips |
| `--z-modal-overlay` | 50 | Modal backdrop |
| `--z-modal` | 60 | Modal content |
| `--z-toast` | 70 | Toast notifications (topmost) |

---

## 6. Components

### Buttons (following Jan Mráz UX sizing cheatsheet)

| Size | Height | Horizontal Padding | Icon Size | Icon-Text Gap | Usage |
|---|---|---|---|---|---|
| Small | 32px (default), 36px (emphasis) | 12px | 14px | 4px | Filters, secondary actions |
| Medium | 40px (default), 48px (emphasis) | 16px | 16px | 8px | Primary actions (Nuevo Camión, Asignar Andén) |
| Large | 52px (default), 56px (emphasis) | 24px | 18px | 8px | Login CTA, critical actions (Despachar Camión) |

Use default height normally. Use emphasis height for standalone CTAs or when the button is the primary action on the page.

**Variants:**

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--accent` | `--bg-primary` (dark text for contrast on orange) | none | Main actions |
| Outline | transparent | `--accent` | `1px solid --accent` | Secondary actions |
| Secondary | `--bg-elevated` | `--text-primary` | `1px solid --bg-elevated` | Cancel, dismiss |
| Danger | `--error` | `--bg-primary` (dark text for contrast on red) | none | Destructive actions |
| Success | `--success` | `--bg-primary` (dark text for contrast) | none | Approvals |
| Disabled | `--bg-elevated` at 50% opacity | `--text-muted` | none | Inactive state, `cursor: not-allowed` |

All buttons: `border-radius: 4px` (6px for Large emphasis), font Oswald uppercase with letter-spacing. Press animation: scale 0.97 for 100ms.

### Cards (KPI / Metric)

- Background: `--bg-surface`
- Border: `1px solid --bg-elevated`
- Border-radius: `6px`
- Padding: `--space-4` (16px)
- Label: Oswald 11px uppercase, `--text-muted`
- Value: Sono 36px bold, color varies by semantic meaning
- Trend indicator: Sono 12px, colored (success/error)

### Tables

- Header: `--bg-elevated` background, Oswald 10px uppercase `--text-muted`
- Rows: Alternating `--bg-surface` / `--bg-primary`
- Cell text: Sono 12px for data, Oswald 12px for descriptive fields
- Row hover: `background: rgba(245,110,15,0.04)` + `border-left: 2px solid --accent`
- Border: `1px solid --bg-elevated` with `border-radius: 6px` on container
- Filter tabs above table: active = `--accent` bg at 12% + border, inactive = `--bg-elevated`

### Badges (Status)

- Background: Semantic base color at 12% opacity (derived programmatically)
- Border: Semantic base color at 25% opacity, 1px solid
- Border-radius: `4px`
- Font: Sono 11px, weight 600
- Text color: Full semantic color
- Minimum contrast: all badge text colors pass WCAG AA against their badge backgrounds

### Inputs

- Background: `--bg-elevated`
- Border: `1px solid --bg-elevated` (resting), `1px solid --accent` (focus), `1px solid --error` (error)
- Focus ring: `box-shadow: 0 0 0 3px rgba(245,110,15,0.15)`
- Error ring: `box-shadow: 0 0 0 3px rgba(200,112,112,0.15)`
- Text: Sono for data inputs (plates, codes), Oswald for text inputs
- Label: Oswald 11px uppercase, `--text-muted` (resting), `--accent` (focus), `--error` (error)
- Helper text: Oswald 11px, `--text-muted` (hint) or `--error` (validation message)
- Height: 40px (default, aligns with Medium buttons), 32px (compact variant for inline use)
- Border-radius: `4px`
- Padding: `--space-2` vertical (8px), `--space-4` horizontal (16px)
- Disabled: 50% opacity, `cursor: not-allowed`

### Selects / Dropdowns

- Trigger: Same styling as inputs
- Dropdown panel: `--bg-surface`, `border: 1px solid --bg-elevated`, `border-radius: 6px`, `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`
- Option hover: `background: rgba(245,110,15,0.06)`
- Option selected: `--accent` text + check icon
- Z-index: `--z-dropdown`

### Tooltips

- Background: `--bg-elevated`
- Text: `--text-primary`, Oswald 12px
- Border-radius: `4px`
- Padding: `6px 10px`
- Arrow: 6px
- Z-index: `--z-tooltip`
- Delay: 300ms show, instant hide

### Modals

- Background: `--bg-surface`
- Overlay: `rgba(0,0,0,0.6)` with `backdrop-filter: blur(4px)`
- Border: `1px solid --bg-elevated`
- Border-radius: `8px`
- Padding: `--space-6` (24px)
- Animation: Scale-in from 0.95 + fade (Framer Motion, 200ms)
- Z-index: overlay `--z-modal-overlay`, content `--z-modal`

### Toasts / Notifications

- Library: **Sonner** (integrates with shadcn/ui)
- Position: Top-right
- Background: `--bg-surface`
- Border: `1px solid --bg-elevated`
- Border-radius: `6px`
- Left accent: 3px border in semantic color matching the toast type
- Icon: Lucide icon in semantic color (check for success, x for error, alert-triangle for warning, info for info)
- Auto-dismiss: 5 seconds (configurable)
- Stacking: Max 3 visible, oldest dismissed on 4th
- Animation: Slide-in from right, 300ms
- Z-index: `--z-toast`

### Loading & Empty States

- **Skeleton:** Pulsing rectangles using `--bg-elevated` on `--bg-surface`, matching the shape of the component they replace (cards, table rows, KPI numbers). Pulse animation: opacity 0.4 → 1 → 0.4, 1.5s ease-in-out infinite.
- **Empty state:** Centered Lucide icon (48px, `--text-muted`), Oswald 16px `--text-muted` message, optional action button.
- **Inline loading:** Small spinner (16px) using `--accent` color, placed next to the loading element.

### Icons

- Library: **Lucide Icons** (comes with shadcn/ui)
- Size: 14px (small), 16px (medium), 18px (large) matching button sizes
- Stroke width: 2
- Color: Inherits from parent text color

---

## 7. Sidebar Navigation

### Structure

- **Expanded width:** 230px
- **Collapsed width:** 56px
- **Background:** `--bg-surface`
- **Border-right:** `1px solid --bg-elevated`
- **Logo:** Orange square (34x34, `--accent`) with truck SVG icon + "DISPATCHTRACK" text (Oswald 15px semibold)
- **Collapsed logo:** Icon-only square
- **Z-index:** `--z-sidebar`

### Navigation Items

- **Item height:** 40px
- **Item padding:** `--space-2` vertical (8px), `--space-4` horizontal (16px) — (expanded), centered (collapsed)
- **Icon-label gap:** `12px`
- **Resting:** Lucide icon 18px `--text-muted` + Oswald 12px uppercase `--text-muted`
- **Active:** Icon and text `--accent`, left border 3px `--accent`, background `rgba(245,110,15,0.08)`
- **Hover:** `background: rgba(251,251,251,0.03)`
- **Collapsed:** Icon-only centered in 38x38 area, same active/resting states
- **Collapse animation:** Width transition 200ms ease (Framer Motion)
- **Section divider:** `1px solid --bg-elevated` with `--space-2` margin top/bottom

### Items by Role Group

**Platform (global roles — Jefe, Coordinadores, Supervisor):**
- Dashboard, Camiones, Andenes, Pallets, Reportes, SAG, Configuración

**Operativo (Pickinero, Cargador, Operador Túnel):**
- Simplified sidebar with only role-relevant items (e.g., Pickinero sees Picking only)

**SAG:**
- Independent portal: Exportaciones, Historial

---

## 8. Frontend Architecture (Hybrid Approach)

### Route Groups (Next.js App Router)

```
app/
├── middleware.ts               ← JWT validation + role-based route protection
├── (auth)/login/               ← Login with background video
├── (platform)/                 ← Global roles: Jefe, Coordinadores, Supervisor
│   ├── layout.tsx             ← Full sidebar + header
│   ├── dashboard/
│   ├── camiones/
│   ├── andenes/
│   ├── pallets/
│   └── reportes/
├── (operativo)/                ← Plant floor: Pickinero, Cargador
│   ├── layout.tsx             ← Simplified sidebar
│   ├── picking/
│   ├── carga/
│   └── tunel/
└── (sag)/                      ← SAG inspector portal
    ├── layout.tsx             ← Independent layout
    └── exportaciones/
```

### Route Protection (middleware.ts)

- Reads JWT from cookie/header on each request
- Validates token and extracts role
- Redirects unauthenticated users to `(auth)/login`
- Redirects authenticated users to their role's route group on login
- Blocks access if role doesn't match route group:
  - `(platform)` → JEFE_DESPACHO, COORDINADOR, COORDINADOR_TRANSPORTE, SUPERVISOR
  - `(operativo)` → PICKINERO, CARGADOR, OPERADOR_TUNEL, SUPERVISOR
  - `(sag)` → SAG
- Supervisor can access both `(platform)` and `(operativo)`, redirects to `(platform)` by default

### Shared Components Location

```
packages/
├── ui/                         ← Design system components (Button, Badge, Card, Table, etc.)
│   ├── src/components/
│   ├── src/hooks/
│   └── src/utils/             ← colorWithOpacity(), cn(), etc.
├── types/                      ← Shared TypeScript types
└── utils/                      ← Shared utilities
```

### Real-time State Management

- **TanStack Query** for server state (REST API data fetching, caching, refetching)
- **Socket.io client** connects on layout mount, joins role-appropriate rooms (global, edificio-specific, sag)
- **WebSocket → Query invalidation:** On receiving a WebSocket event, invalidate the relevant TanStack Query key to trigger a refetch with animated transition
- **No separate global store needed** — TanStack Query serves as the server state cache, WebSocket events just trigger invalidations
- **Reconnection strategy:** Socket.io auto-reconnect with exponential backoff. On disconnect, show a subtle toast "Reconectando..." with `--warning` accent. On reconnect, invalidate all active queries to sync stale data. If disconnected >30s, show persistent banner at top of layout.

### Rationale

- **Platform** (Jefe, Coordinadores, Supervisor): Rich navigation, multiple modules, full dashboard with charts
- **Operativo** (Pickinero, Cargador, Operador Túnel): Simple, focused UI. Workers on plant floor need to scan and confirm quickly
- **SAG**: Independent portal focused on export inspections
- **Supervisor**: Redirects to Platform by default, but can access Operativo views

---

## 9. Login Page

- **Background:** Looping video of trucks/logistics with dark overlay (`rgba(0,0,0,0.7)`)
- **Form:** Centered, floating card on `--bg-surface` with `backdrop-filter: blur(8px)`, `border: 1px solid --bg-elevated`
- **CTA:** Large button (56px emphasis — primary action on page) with `--accent`
- **Logo:** DispatchTrack branding prominent above form (truck icon + Oswald text)
- **Fields:** RUT/Email + Password, with validation states
- **Remember me:** Optional checkbox

---

## 10. ECharts Theme

Dashboard charts follow the design system palette:

| Element | Color/Style |
|---|---|
| Background | Transparent (inherits card `--bg-surface`) |
| Text (axis labels, legend) | `--text-muted`, Oswald 11px |
| Axis lines | `--bg-elevated` |
| Grid lines | `rgba(38,38,38,0.5)` (subtle) |
| Tooltip | `--bg-elevated` background, `--text-primary` text, `border: 1px solid rgba(251,251,251,0.08)` |
| Series palette | `--accent`, `--info`, `--success`, `--warning`, `--error`, `#9B7BCC` (purple accent for 6th series) |
| Bar/area fill | 80% opacity of series color |
| Highlight on hover | Full opacity + slight glow |

---

## 11. Animations (Framer Motion)

| Interaction | Animation | Duration |
|---|---|---|
| Page load | Fade-in + slide-up (y: 8px → 0) | 200ms |
| Cards/rows appear | Stagger fade-in | 50ms between items |
| KPI numbers | Count-up on mount | 600ms |
| Truck state change | Badge pulse (scale 1.1 → 1) + color transition | 300ms |
| Card/row hover | translateY -2px + border-left `--accent` | 150ms |
| Sidebar collapse | Width transition | 200ms ease |
| Modals | Scale from 0.95 + fade | 200ms |
| WebSocket notification | Slide-in from right | 300ms |
| Button press | Scale down 0.97 | 100ms |
| Skeleton pulse | Opacity 0.4 → 1 → 0.4 | 1500ms infinite |

### Real-time Updates

- WebSocket events trigger animated state transitions on affected elements
- New truck arrivals animate into list with highlight flash
- State changes on visible trucks animate badge color swap with pulse
- KPI numbers re-count when values update

---

## 12. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Desktop (>1024px) | Full sidebar expanded + content |
| Tablet (768-1024px) | Sidebar collapsed by default, expandable on tap |
| Mobile (<768px) | Not a primary target. Sidebar becomes off-canvas drawer. Operativo views are touch-optimized and work well on tablet/mobile. Platform views degrade gracefully but are desktop-first. |

**Operativo views** are designed tablet-first: large touch targets (minimum 44x44px), simplified layouts, scanner-friendly workflows.

---

## 13. Accessibility

- **Contrast ratios:** All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text). `--text-muted` adjusted to `#9A9A9A` to meet 4.5:1 on `--bg-surface`.
- **Focus indicators:** All interactive elements show visible focus ring (`--accent` glow) when navigated via keyboard.
- **Keyboard navigation:** All actions reachable via Tab/Enter/Escape. Modals trap focus. Sidebar items navigable with arrow keys.
- **Screen readers:** Semantic HTML (nav, main, aside, table, button). ARIA labels on icon-only buttons and sidebar collapsed state. Status badge changes announced via `aria-live="polite"` regions.
- **Reduced motion:** Respect `prefers-reduced-motion` — disable Framer Motion animations, use instant transitions instead.

---

## 14. Key UX Principles

1. **Interactivity first** — Everything should feel alive and responsive
2. **Role-appropriate complexity** — Global roles get rich dashboards; plant workers get focused task views
3. **Real-time feedback** — WebSocket updates reflected immediately with visual transitions
4. **Industrial aesthetic** — Bold borders, defined separations, control panel feel
5. **Data clarity** — Sono monospace for data ensures easy scanning of numbers and codes
6. **Consistent spacing** — Base-4 spacing system + button sizes following UX best practices
7. **Accessible by default** — WCAG AA compliance, keyboard navigation, screen reader support
