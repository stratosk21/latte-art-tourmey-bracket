# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

There is no test runner configured.

## Architecture

**BRACKET** is a tournament management platform built with Next.js 16 (App Router), React 19, and TypeScript. All data is currently mock/hardcoded — there is no backend integration.

### Screen routing

`app/page.tsx` is a client component that manages a global `screen` state string (`"login" | "dashboard" | "bracket" | "past-matches" | "admin" | "admin-users"`). It renders either `<LoginPage>` or `<DashboardLayout>` based on authentication state. `DashboardLayout` passes the current screen and a `setScreen` callback down to `<Sidebar>` and the active screen component.

### Component structure

- `components/screens/` — Full-page view components (one per screen state)
- `components/ui/` — 59 shadcn/ui components wrapping Radix UI primitives
- `components/wave-pattern.tsx` — Canvas-based animated wave visualization (used as hero backgrounds)

### Styling

- Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.js` — v4 uses CSS-native config)
- Design tokens defined in `app/globals.css` as CSS custom properties using `oklch()` color space
- shadcn/ui configured with `new-york` style, `neutral` base color, CSS variables enabled
- Path alias `@/*` maps to the project root

### Key conventions

- `cn()` from `lib/utils.ts` is used everywhere for conditional Tailwind class merging
- `"use client"` directive on all screen and interactive components
- Match statuses: `"live"`, `"upcoming"`, `"done"`, `"bye"`
- Bracket formats: single elimination and double elimination (Winners/Losers brackets)
- `next.config.mjs` sets `ignoreBuildErrors: true` and `images.unoptimized: true`
