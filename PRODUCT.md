# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

StarForge education-center staff use this browser workspace for the operational work allowed by their authenticated role and organizational scope. Users include teachers, teaching assistants, reception, admissions and sales staff, print operators, cashiers, media staff, and other non-management staff identities returned by the production service.

## Product Purpose

Give staff a single permission-aware web workspace for daily teaching and center operations. Success means a user can understand what needs attention, complete authorized work accurately, and trust that submitted data reaches the production backend in the contract shape it expects.

## Positioning

This is the staff counterpart to the StarForge leadership workspace. It shares one visual family and backend truth, while presenting role-specific work rather than executive administration.

## Operating Context

The product is used on desktop and mobile-width browsers at classrooms, front desks, and back-office workstations. Common work includes groups, attendance, students, admissions, forms and surveys, tasks, messages, printing, content, finance, requests, notifications, and personal employment records.

## Capabilities and Constraints

- The production StarForge Edu `/api/v1/` service is authoritative for data, permissions, and organizational scope.
- Feature visibility follows effective permissions and principal type; the client must not invent grants or expose management-only tools.
- Uzbek, Russian, and English localization, light/dark themes, protected-content behavior, and responsive layouts must be preserved.
- Loading, empty, stale, offline, validation, and error states are first-class product states.
- Production credentials, policy decisions, and backend fields not present in the contract must not be fabricated.

## Brand Commitments

StarForge products use a warm, editorial, operational visual system: cream surfaces, ink typography, restrained terracotta and saffron accents, clear information hierarchy, code-native icons, modest motion, and consistent controls. The CEO web application is the adjacent reference; staff workflows should feel like the same system at a different responsibility level.

## Evidence on Hand

- The repository contains the production-connected service layer, role-aware routes, localization catalog, UI primitives, and automated tests.
- The adjacent `starforge_ceo_web` repository is the established leadership-side visual reference.
- The adjacent `starforge_staff_mobile` repository is the native staff companion and should preserve the same product language through platform conventions.
- No approved marketing claims, universal credentials, or production staff data are present and none may be invented.

## Product Principles

1. Backend and permission truth before decorative completeness.
2. Show the work relevant to the signed-in person and explain unavailable states clearly.
3. Make data entry and irreversible actions deliberate, legible, and verifiable.
4. Keep web and mobile recognizably StarForge without ignoring platform behavior.
5. Treat localization, accessibility, and responsive behavior as core functionality.

## Accessibility & Inclusion

Preserve keyboard navigation, visible focus, semantic controls, screen-reader labels, sufficient contrast, reduced-motion support, robust text wrapping, and usable layouts across narrow phones through large desktops in all supported locales.
