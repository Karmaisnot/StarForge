/* eslint-disable react-refresh/only-export-components */
// Icon registry — line geometric set, 1.7 default stroke.
// Each entry holds the inner SVG children; a few override stroke for heavier marks.
// Rendered by <Icon name="..." /> (see Icon.jsx). viewBox is 0 0 24 24.

export const ICONS = {
  home: {
    children: (
      <>
        <path d="M3.5 11.2 L12 4 L20.5 11.2 V20 a1 1 0 0 1 -1 1 H4.5 a1 1 0 0 1 -1 -1 Z" />
        <path d="M9.5 21 v-6.5 h5 V21" />
      </>
    ),
  },
  cal: {
    children: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
      </>
    ),
  },
  cohort: {
    children: (
      <>
        <circle cx="9" cy="10" r="3.2" />
        <circle cx="17" cy="11" r="2.5" />
        <path d="M3.5 20 c0-3 2.5-5 5.5-5 s5.5 2 5.5 5" />
        <path d="M14.5 19.5 c0.3-2 2-3.5 4-3.5 c1 0 1.7 0.3 2 0.8" />
      </>
    ),
  },
  book: {
    children: (
      <>
        <path d="M4 5 a2 2 0 0 1 2-2 h12 v17 H6 a2 2 0 0 0 -2 2 Z M4 5 v15" />
        <path d="M8 7 H16 M8 11 H14" />
      </>
    ),
  },
  chat: {
    children: (
      <path d="M5 4 H19 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H12 L7 21 V17 H5 a2 2 0 0 1 -2 -2 V6 a2 2 0 0 1 2 -2 Z" />
    ),
  },
  bell: {
    children: <path d="M6 16 V11 a6 6 0 0 1 12 0 V16 L20 18 H4 Z M10 21 a2 2 0 0 0 4 0" />,
  },
  user: {
    children: (
      <>
        <circle cx="12" cy="8" r="3.7" />
        <path d="M4.5 20 c0-3.5 3-6 7.5-6 s7.5 2.5 7.5 6" />
      </>
    ),
  },
  check: { stroke: 2.4, children: <path d="M5 12.5 L10 17.5 L19.5 7" /> },
  x: { stroke: 2.4, children: <path d="M6 6 L18 18 M18 6 L6 18" /> },
  clock: {
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7 V12 L15.5 14" />
      </>
    ),
  },
  search: {
    children: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16 L20.5 20.5" />
      </>
    ),
  },
  plus: { stroke: 2.2, children: <path d="M12 5 V19 M5 12 H19" /> },
  arrowR: { children: <path d="M5 12 H19 M14 6 L20 12 L14 18" /> },
  arrowL: { children: <path d="M19 12 H5 M10 6 L4 12 L10 18" /> },
  refresh: {
    children: (
      <>
        <path d="M20 7 V3 L16 7 H20 A8 8 0 0 0 5 9" />
        <path d="M4 17 V21 L8 17 H4 A8 8 0 0 0 19 15" />
      </>
    ),
  },
  chevR: { children: <path d="M9 6 L15 12 L9 18" /> },
  chevD: { children: <path d="M6 9 L12 15 L18 9" /> },
  more: {
    children: (
      <>
        <circle cx="5" cy="12" r="1.4" fill="currentColor" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        <circle cx="19" cy="12" r="1.4" fill="currentColor" />
      </>
    ),
  },
  filter: { children: <path d="M4 5 H20 M7 12 H17 M10 19 H14" /> },
  pin: {
    children: <path d="M12 21 V14 M6 8 a6 6 0 0 1 12 0 c0 4-3 6-6 6 s-6-2-6-6 Z" />,
  },
  edit: { children: <path d="M4 20 H8 L19 9 L15 5 L4 16 Z" /> },
  ai: {
    children: (
      <>
        <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z" />
        <circle cx="19" cy="5" r="1.2" fill="currentColor" />
        <circle cx="6" cy="19" r="1.2" fill="currentColor" />
      </>
    ),
  },
  attach: {
    children: (
      <path d="M14 6 L7.5 12.5 a3.5 3.5 0 0 0 5 5 L19.5 11 a5.5 5.5 0 0 0 -7.8 -7.8 L4.5 10.5" />
    ),
  },
  send: { children: <path d="M4 12 L20 4 L14 20 L12 13 Z" /> },
  mic: {
    children: (
      <>
        <rect x="8" y="3" width="8" height="13" rx="4" />
        <path d="M5 11 a7 7 0 0 0 14 0 M12 18 V22 M8 22 H16" />
      </>
    ),
  },
  image: {
    children: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="9" cy="10" r="2" />
        <path d="M4 18 L9 13 L12 16 L15 12 L20 17" />
      </>
    ),
  },
  play: { children: <path d="M8 5 L19 12 L8 19 Z" /> },
  users: {
    children: (
      <>
        <circle cx="9" cy="9" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20 c0-3 2.5-5 6-5 s6 2 6 5 M15 16 c3 0 5 1.5 5.5 4" />
      </>
    ),
  },
  doc: {
    children: <path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19 M8 13 H17 M8 17 H14" />,
  },
  pdf: { children: <path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19" /> },
  video: {
    children: (
      <>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="M17 10 L22 7 V17 L17 14" />
      </>
    ),
  },
  folder: {
    children: (
      <path d="M3 7 a2 2 0 0 1 2-2 h4 L11 7 H19 a2 2 0 0 1 2 2 V18 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" />
    ),
  },
  archive: {
    children: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M3 4 H21 V8 H3 Z M9 12 H15" />
      </>
    ),
  },
  trash: {
    children: <path d="M4 7 H20 M9 7 V4 H15 V7 M7 7 L8 21 H16 L17 7 M10 11 V17 M14 11 V17" />,
  },
  upload: { children: <path d="M12 16 V4 M6 10 L12 4 L18 10 M4 20 H20" /> },
  print: {
    children: (
      <path d="M7 9 V3 H17 V9 M5 9 H19 a2 2 0 0 1 2 2 V17 H17 V21 H7 V17 H3 V11 a2 2 0 0 1 2 -2 Z" />
    ),
  },
  pie: { children: <path d="M12 3 V12 H21 a9 9 0 1 1 -9 -9 Z" /> },
  trend: { children: <path d="M4 17 L9 11 L13 14 L20 6 M20 6 H15 M20 6 V11" /> },
  globe: {
    children: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12 H21 M12 3 a13 13 0 0 1 0 18 M12 3 a13 13 0 0 0 0 18" />
      </>
    ),
  },
  settings: {
    children: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2 V5 M12 19 V22 M4 12 H2 M22 12 H19 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6" />
      </>
    ),
  },
  logout: {
    children: (
      <path d="M9 5 H5 a1 1 0 0 0 -1 1 V18 a1 1 0 0 0 1 1 H9 M15 8 L20 12 L15 16 M20 12 H9" />
    ),
  },
  brand: {
    children: <path d="M12 3 L14 9 L20 10 L15 14 L17 20 L12 17 L7 20 L9 14 L4 10 L10 9 Z" />,
  },
  shield: { children: <path d="M12 3 L20 6 V12 c0 5-4 8-8 9 c-4-1-8-4-8-9 V6 Z" /> },
  flag: { children: <path d="M5 21 V4 H15 L13 8 L15 12 H5" /> },
  download: { children: <path d="M12 4 V16 M6 10 L12 16 L18 10 M4 20 H20" /> },
  sun: {
    children: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
      </>
    ),
  },
  moon: { children: <path d="M20 14.5 A8.5 8.5 0 0 1 9.5 4 A7 7 0 1 0 20 14.5 Z" /> },
};

export const ICON_NAMES = Object.keys(ICONS);
