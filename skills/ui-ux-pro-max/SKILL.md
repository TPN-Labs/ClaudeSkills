---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. A searchable database of 80+ visual styles, 160+ color palettes, font pairings, product-type reasoning rules, UX guidelines, and chart recommendations across 17 stacks (React, Next.js, Vue, Nuxt.js, Nuxt UI, Svelte, Astro, HTML/Tailwind, shadcn/ui, SwiftUI, React Native, Flutter, Jetpack Compose, Angular, Laravel, JavaFX, Three.js). Use whenever a task changes how something looks, feels, moves, or is interacted with: designing or building a page (landing, dashboard, admin, SaaS, e-commerce, portfolio, mobile app), creating or refactoring UI components (button, modal, navbar, sidebar, card, table, form, chart), choosing a style/color/typography/spacing system, implementing dark mode, animation, or responsive layout, or reviewing UI code for accessibility, usability, or visual consistency. Triggers: plan/build/create/design/implement/review/fix/improve/optimize/refactor a UI. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, flat. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, gradient, charts."
---

# UI/UX Pro Max — Design Intelligence

A searchable design knowledge base plus a small Python query tool. It turns a vague "make this look good"
into concrete, defensible decisions: a matched visual style, an accessible color palette, a font pairing,
a landing/dashboard structure, the right chart for the data, and the platform-correct UX rules — with
anti-patterns called out — across 17 web and mobile stacks.

At TPN Labs we build across web, mobile, and cloud for many industries, so this skill is stack-agnostic:
always pass the stack the current project actually uses.

> Adapted from the open-source, MIT-licensed [`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
> skill (© Next Level Builder). See `references/` for the full rule catalogs. Attribution is in `NOTICE`.

## When to Apply

Use this skill whenever a task will change how a feature **looks, feels, moves, or is interacted with**.

**Must use:**
- Designing new pages (landing, dashboard, admin, SaaS, e-commerce, portfolio, mobile app)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, navigation)
- Choosing a color scheme, typography system, spacing scale, or layout/grid system
- Reviewing UI code for accessibility, usability, or visual consistency
- Implementing dark mode, animation, or responsive behavior

**Recommended:**
- UI feels "not professional enough" but the reason is unclear
- Reacting to usability/experience feedback, or doing pre-launch UI polish
- Aligning cross-platform design (Web / iOS / Android) or building a design system

**Skip:** pure backend/API/database work, non-visual scripts, infra/DevOps, or performance work unrelated to the interface.

## Rule Categories by Priority

When reviewing or building, work the categories top-down — fix CRITICAL before MEDIUM. Full rule lists with
platform notes and code examples live in `references/ux-rules.md` (search them live with `--domain ux`).

| Priority | Category | Impact | Domain | Must Have | Avoid |
|----------|----------|--------|--------|-----------|-------|
| 1 | Accessibility | CRITICAL | `ux` | Contrast 4.5:1, alt text, keyboard nav, aria-labels | Removing focus rings, icon-only buttons without labels |
| 2 | Touch & Interaction | CRITICAL | `ux` | Min target 44×44px, 8px+ spacing, loading feedback | Hover-only interactions, instant (0ms) state changes |
| 3 | Performance | HIGH | `ux` | WebP/AVIF, lazy loading, reserve space (CLS < 0.1) | Layout thrashing, cumulative layout shift |
| 4 | Style Selection | HIGH | `style`, `product` | Match product type, consistency, SVG icons | Mixing styles randomly, emoji as icons |
| 5 | Layout & Responsive | HIGH | `ux` | Mobile-first breakpoints, viewport meta, no h-scroll | Horizontal scroll, fixed px widths, disabling zoom |
| 6 | Typography & Color | MEDIUM | `typography`, `color` | Base 16px, line-height 1.5, semantic tokens | Body text < 12px, gray-on-gray, raw hex in components |
| 7 | Animation | MEDIUM | `ux` | 150–300ms, motion conveys meaning, spatial continuity | Decorative-only motion, animating width/height, no reduced-motion |
| 8 | Forms & Feedback | MEDIUM | `ux` | Visible labels, error near field, helper text | Placeholder-only labels, errors only at top |
| 9 | Navigation | HIGH | `ux` | Predictable back, bottom nav ≤5, deep linking | Overloaded nav, broken back, no deep links |
| 10 | Charts & Data | LOW | `chart` | Legends, tooltips, accessible colors | Conveying meaning by color alone |

## Prerequisites

The query tool is Python 3 with no third-party dependencies. Check it's available:

```bash
python3 --version || python --version
```

On Windows, use `python` instead of `python3` to run the scripts.

## How to Use

Run the commands below **from this skill's directory** (the folder containing this `SKILL.md`) so the
relative `scripts/` and `data/` paths resolve. The script reads its CSV data relative to its own location,
so it works regardless of which project you're in.

### Step 1 — Analyze the request

Pull out: **product type** (e.g. SaaS, e-commerce, fintech, healthcare, beauty/wellness, portfolio, tool),
**audience & context**, **style keywords** (minimal, playful, dark, content-first, immersive…), and the
**stack the project actually uses**.

### Step 2 — Generate a design system (start here)

`--design-system` searches the product, style, color, landing, and typography domains in parallel, applies
the reasoning rules, and returns a complete recommendation (pattern, style, colors, typography, effects) plus
anti-patterns to avoid:

```bash
python3 scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
# Example:
python3 scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
# Markdown instead of the ASCII box:
python3 scripts/search.py "fintech crypto" --design-system -f markdown
```

**Persist it across sessions** with `--persist` (writes `design-system/MASTER.md`), and add `--page "<name>"`
to also create a page-specific override under `design-system/pages/`:

```bash
python3 scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

When later building a specific page, read `design-system/MASTER.md`; if `design-system/pages/<page>.md` exists,
its rules **override** the master.

### Step 3 — Deep-dive any dimension (as needed)

```bash
python3 scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
# Examples:
python3 scripts/search.py "glassmorphism dark" --domain style
python3 scripts/search.py "fintech vibrant" --domain color
python3 scripts/search.py "real-time dashboard" --domain chart
python3 scripts/search.py "animation accessibility loading" --domain ux
```

### Step 4 — Stack-specific implementation guidance

Always pass the project's real stack:

```bash
python3 scripts/search.py "<keyword>" --stack <stack>
# Examples:
python3 scripts/search.py "rerender memo list" --stack react
python3 scripts/search.py "navigation list performance" --stack react-native
python3 scripts/search.py "server components streaming" --stack nextjs
```

Then synthesize the design system + deep-dives + stack guidance and implement.

## Search Reference

### Domains (`--domain`)

| Domain | Use for | Example keywords |
|--------|---------|------------------|
| `product` | Product-type recommendations | saas, e-commerce, portfolio, healthcare, beauty, fintech |
| `style` | UI styles, effects, colors | glassmorphism, minimalism, dark mode, brutalism |
| `color` | Color palettes by product type | saas, ecommerce, healthcare, fintech, beauty |
| `typography` | Font pairings | elegant, playful, professional, modern |
| `google-fonts` | Individual Google Font lookup | sans serif, monospace, variable, popular |
| `landing` | Page structure & CTA strategy | hero, social-proof, pricing, testimonial |
| `chart` | Chart-type selection & libraries | trend, comparison, timeline, funnel, pie |
| `icons` | Icon set / glyph lookup | navigation, settings, social, arrows |
| `ux` | Best practices & anti-patterns | accessibility, animation, z-index, loading |
| `react` | React/Next.js performance | waterfall, bundle, suspense, memo, rerender |
| `web` | App-interface a11y/touch (iOS/Android/RN) | accessibilityLabel, touch targets, safe areas |

### Stacks (`--stack`)

`react`, `nextjs`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `astro`, `html-tailwind`, `shadcn`,
`swiftui`, `react-native`, `flutter`, `jetpack-compose`, `angular`, `laravel`, `javafx`, `threejs`

## Reviewing existing UI

For a UI review or fix, you don't need the generator — go straight to the checklist:

1. Walk `references/ux-rules.md` top-down (CRITICAL → LOW). Stop at the first category the UI clearly violates.
2. For native/mobile work, also run `references/app-ui-checklist.md` (safe areas, tap feedback, dark-mode parity).
3. Search `--domain ux "<symptom>"` for the specific rule, its rationale, and good/bad code examples.

Common sticking points → where to look:

| Problem | Look at |
|---------|---------|
| Can't decide on style/color | Re-run `--design-system` with different keywords |
| Dark-mode contrast issues | ux-rules §6: `color-dark-mode`, `color-accessible-pairs` |
| Animations feel unnatural | ux-rules §7: `spring-physics`, `easing`, `exit-faster-than-enter` |
| Form UX is poor | ux-rules §8: `inline-validation`, `error-clarity`, `focus-management` |
| Navigation confusing | ux-rules §9: `nav-hierarchy`, `bottom-nav-limit`, `back-behavior` |
| Breaks on small screens | ux-rules §5: `mobile-first`, `breakpoint-consistency` |
| Jank / performance | ux-rules §3: `virtualize-lists`, `main-thread-budget`, `debounce-throttle` |

## Tips

- Use **multi-dimensional queries** — product + industry + tone + density (`"saas analytics professional data-dense"`), not just `"app"`.
- If results miss, rephrase: `"playful neon"` → `"vibrant dark"` → `"content-first minimal"`.
- `--design-system` first for the full picture, then `--domain` to settle any single dimension you're unsure about.
- As a pre-delivery pass: run `--domain ux "animation accessibility loading"`, then walk ux-rules §1–§3 (the CRITICAL/HIGH tiers).
