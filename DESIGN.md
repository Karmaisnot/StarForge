---
name: StarForge Staff Web
description: A warm, responsive, permission-aware workspace for everyday education-center operations.
colors:
  canvas: "#fbf6ec"
  surface: "#fffcf5"
  surface-quiet: "#f4ebd8"
  surface-strong: "#eadfc4"
  ink: "#1f1b16"
  ink-secondary: "#3a332a"
  muted: "#786850"
  border: "#e5d9be"
  border-strong: "#cfc0a0"
  primary: "#b85535"
  primary-hover: "#a04524"
  primary-soft: "#f3d9cc"
  accent: "#d89a2e"
  accent-soft: "#f6e4b8"
  success: "#4f7b3b"
  warning: "#9b6414"
  danger: "#b33a2a"
  dark-canvas: "#14110d"
  dark-surface: "#1d1914"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(35px, 4.4vw, 58px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Manrope Variable', Aptos, 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(27px, 3vw, 40px)"
    fontWeight: 760
    lineHeight: 1.04
    letterSpacing: "-0.055em"
  body:
    fontFamily: "'Manrope Variable', Aptos, 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "'Manrope Variable', Aptos, 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1.4
  numeric:
    fontFamily: "'Cascadia Code', 'SFMono-Regular', Consolas, ui-monospace, monospace"
    fontWeight: 700
rounded:
  sm: "8px"
  control: "10px"
  md: "14px"
  card: "16px"
  lg: "22px"
  xl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  button-soft:
    backgroundColor: "{colors.surface-quiet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: StarForge Staff Web

## Overview

**Creative North Star: "Warm Editorial Operations"**

Staff web is the task-focused sibling of the leadership workspace. It uses the same warm cream, ink, terracotta, saffron, eight-point mark, and compact operational hierarchy, while favoring faster scanning, direct data entry, and role-relevant work.

The visual system is responsive from classroom and front-desk desktops down to phone-width browsers. It supports Uzbek, Russian, and English, light and dark themes, and permission-pruned navigation. Product state and backend truth take precedence over decorative completeness.

The normative palette source is `src/styles/tokens.css`; global typography, focus, reduced motion, and utilities live in `src/styles/base.css`. Shared React primitives live in `src/ui/`, shell patterns in `src/layout/`, and feature CSS Modules own only feature-specific composition.

**Key Characteristics:**

- Shared StarForge warmth with a practical staff-level density.
- Clear task entry points, form progression, and completion feedback.
- Responsive shell, permission-filtered destinations, and localization-safe composition.
- Light/dark and selectable palette behavior through semantic tokens.
- First-class loading, stale, empty, validation, and failure states.

## Colors

Saroy is the default: warm canvas and cream surfaces with terracotta interaction and saffron emphasis. Status colors remain semantic and quiet.

### Primary

- **Saroy Terracotta:** Primary buttons, active navigation, links, focus rings, progress, selected choices, and key counts.
- **Terracotta Soft:** Active tabs, selected answers, icon backplates, and low-intensity feature heroes.

### Secondary

- **Saffron:** Attention and signature AI warmth, used more sparingly than terracotta.
- **Semantic Green / Amber / Red:** Success, needs-attention, and destructive/critical states with paired soft surfaces.

### Neutral

- **Warm Canvas / Cream Surface:** Page background and foreground card surface.
- **Quiet / Strong Surface:** Form fill, hover, nested regions, and tonal hierarchy.
- **Ink / Secondary Ink / Muted:** Primary content, supporting content, and metadata.
- **Border / Strong Border:** Container separation and emphasized or dashed boundaries.

Marvarid, Samarqand, and Daryo are established alternate palettes. Dark mode overlays the current palette. Components must consume semantic `--sf-*` variables so every combination remains coherent.

**The Palette Cascade Rule.** Theme and palette behavior belongs in `tokens.css`; feature modules must not fork the brand with hard-coded replacements.

## Typography

**Display Font:** Georgia with Times New Roman fallback.

**Body Font:** Bundled Manrope Variable with Aptos, Segoe UI, and system sans fallbacks.

**Label/Mono Font:** Cascadia Code with system monospace fallbacks.

Manrope is the working face. Georgia gives survey heroes, reflective prompts, and a small number of feature headings an editorial voice. Monospace is for counts, progress, keyboard hints, and identifiers—not ordinary prose.

### Hierarchy

- **Feature display:** Medium-weight serif with tight leading for the main survey/form moment.
- **Page headline:** High-weight Manrope, responsive and tightly tracked.
- **Card/section title:** 14–28px depending on hierarchy; use serif only where the incumbent feature already does.
- **Body:** Usually 11–14px with 1.5–1.65 line height.
- **Label:** Compact high-weight text; uppercase tracking is limited to short metadata categories.
- **Numeric:** Monospace or tabular numerals for progress, counts, dates, and aligned results.

**The Translation Fit Rule.** Labels may grow in Uzbek, Russian, or English; reserve width and allow wrapping or intentional ellipsis before reducing type.

## Layout

The desktop shell uses a 264px sidebar and a sticky 64px top bar. Between 768px and 1023px the rail compacts to 72px. Below 768px it becomes a focus-trapped drawer with a scrim, while permission-filtered primary destinations appear in a fixed, safe-area-aware bottom tab bar. Main content is centered to 1440px with 32px desktop and 14px phone gutters.

Grid children containing user or translated content use `minmax(0, 1fr)` and `min-width: 0`. Feature grids generally move from three columns to two around 1050px and to one around 720px. Mobile content reserves bottom space for the fixed tab bar.

Survey and form screens use a consistent sequence: page header, low-intensity feature hero, active-work cards, history/archive, then full-page or modal completion flow. The survey runner uses a question navigator, central question stage, and summary on wide screens; side regions collapse as width decreases. Choice targets remain large and explicit, while text answers use multiline fields with visible focus and character context.

The survey archive is localization-safe by construction: the desktop row reserves a fixed icon column, a flexible `minmax` title/issuer column, and bounded max-content metadata columns. Every child can shrink; title and issuer ellipsize intentionally, and dates stay unbroken. At 1180px the date is removed; at 820px secondary metadata is removed and the remaining status stays beside the flexible identity column. Extend this pattern rather than assigning fixed text widths.

**The Archive Priority Rule.** On narrow screens preserve identity and state first; progressively remove secondary metadata instead of crushing translated labels.

## Elevation & Depth

The system uses a hybrid of tonal layering, one-pixel borders, and shallow ambient shadow. Primary cards and feature heroes may receive a quiet shadow; nested form sections and progress panels are separated tonally. Dialogs and command surfaces may lift more strongly because they temporarily sit above the task.

The shared AI gradient and hero gradients are semantic theme-aware surfaces. They are not general-purpose decoration.

**The Quiet Surface Rule.** Use color and border to define task structure before adding another shadow.

## Shapes

Controls use 8–10px corners, ordinary cards use 14–20px corners, large heroes use 22–28px corners, and pills are fully rounded. Form-builder question blocks and selected answers remain rectilinear enough to scan, with soft corners rather than bubble-like containers.

The StarForge mark is the recurring signature geometry. Use `StarMark`/`Icon` from `src/ui/`; do not substitute emoji, icon fonts, or unrelated SVG packs.

## Components

### Buttons

- `Button` owns primary, soft, ghost, outline, ink, and contextual variants. Buttons are pill-shaped, compact, and high-weight.
- Primary actions use terracotta and cream. Active presses scale subtly; disabled actions lose opacity and do not animate.
- Keep icons at the established 14–20px optical scale and use `iconRight` only where progression benefits.

### Chips

- `Chip` communicates semantic status with matching soft fills.
- `FilterChip` is outlined at rest and ink-filled when selected; hover must never erase active text contrast.
- Keep chip copy short. Long translated state labels need surrounding layout flexibility.

### Cards / Containers

- `Card` owns the ordinary bordered surface and header/body division.
- Page headers, async state wrappers, modal structure, and feature heroes should reuse their layout primitives rather than restyling generic divs.

### Inputs / Forms

- Fields use a theme surface, 10px corners, visible labels, and a terracotta border plus soft ring on focus.
- Form builders group identity/meta first, then settings, then numbered questions. Question actions remain adjacent to their question and the save/publish footer stays visible in a scrollable modal.
- Survey runners maintain typed answer semantics, visible progress, required-state feedback, and separate previous/next/submit actions.
- Validation belongs near the field or task. Toasts confirm outcomes but do not replace inline recovery.

### Navigation

- Sidebar, compact rail, mobile drawer, and bottom tabs are one permission-filtered destination model.
- Active navigation uses primary fill on desktop and primary-soft indicators on mobile. Drawers trap focus, close on Escape, and restore prior focus.

### Loading, Empty, and Error States

- `AsyncBoundary` shows existing data during refresh or transient refetch failure instead of flashing a spinner or blanking useful work.
- Use the shared branded loader for initial loading, an explicit error panel for failed initial loads, and feature-specific empty states only for successful zero-result responses.
- Empty states state what is absent and what the user can do next. A failed request must never masquerade as an empty list.

### Motion

Hover, press, drawer, progress, and selection transitions are modest and brief. `src/styles/base.css` globally collapses animation and transition durations for `prefers-reduced-motion`; feature motion must remain compatible with that override.

## Do's and Don'ts

### Do:

- **Do** extend `src/ui`, `src/layout`, and an existing feature module before creating a one-off button, card, state panel, tab, or form control.
- **Do** use semantic tokens for every theme-sensitive color and test both light and dark appearances.
- **Do** preserve keyboard focus, drawer focus management, screen-reader naming, reduced motion, and robust translated text behavior.
- **Do** keep route and navigation visibility aligned with effective permissions and principal type.
- **Do** distinguish loading, stale data, offline/service failure, validation, permission, and genuine empty states.

### Don't:

- **Don't** expose management-only tools or fabricate grants, records, backend fields, or successful mutations.
- **Don't** hard-code fixed widths for archive titles, issuers, status labels, or localized action copy.
- **Don't** create a new visual brand for a staff feature; stay within the StarForge palette, type, icon, surface, and state language.
- **Don't** use a toast as the only explanation for a failed form or an irreversible action.
- **Don't** add decorative eyebrow labels or extra gradients when heading hierarchy already supplies the needed structure.
