/**
 * The Empathia icon set: inline SVG on a 24-unit grid, one consistent 1.75 stroke, round caps and joins, currentColor only (so an icon
 * takes its colour from the text around it in either theme). CSP-safe: no style attribute, no external sprite.
 *
 *   <Icon name="campus" />                       decorative (aria-hidden), next to a visible label
 *   <Icon name="bell" label="Notifications" />   meaningful on its own: role="img" with that name
 *
 * Add an icon by adding its path data to PATHS; keep it on the 24 grid with a 2-unit margin and strokes only (no fills), so the set
 * stays one family.
 */
const PATHS = {
  home: 'M3.5 10.5 12 4l8.5 6.5M5.5 9v10.5h4.5v-6h4v6h4.5V9',
  campus: 'M12 3 3 7.5l9 4.5 9-4.5L12 3ZM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20.5 20.5l-5-5',
  room: 'M4 20.5V5.5l9-2v17M13 3.5l7 2v15M2.5 20.5h19M10 12.5v1',
  more: 'M6.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0ZM13.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0ZM20.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  bell: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 20.5a2 2 0 0 0 4 0',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  system: 'M3.5 5h17v11h-17zM9 20h6M12 16v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6',
  'chevron-right': 'm9.5 5.5 6.5 6.5-6.5 6.5',
  'chevron-down': 'm5.5 9.5 6.5 6.5 6.5-6.5',
  'chevron-left': 'm14.5 5.5-6.5 6.5 6.5 6.5',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm4.5 12.5 5 5 10-11',
  alert: 'M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.5h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.5h.01',
  wrench: 'M14.5 4a5 5 0 0 0-4.6 6.9L3.5 17.3a2.2 2.2 0 0 0 3.2 3.2l6.4-6.4A5 5 0 0 0 20 9.5l-3 3-3.5-1-1-3.5 3-3a5 5 0 0 0-1-.5Z',
  shield: 'M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3ZM8.8 12l2.2 2.2 4.3-4.4',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  chart: 'M4 20.5h16M6.5 17V11M11 17V6.5M15.5 17v-4M20 17V9',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5',
  map: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14',
  place: 'M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0c0 5 6.5 11 6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  book: 'M4.5 5A2.5 2.5 0 0 1 7 2.5h12.5v16H7a2.5 2.5 0 0 0-2.5 2.5V5ZM4.5 19A2.5 2.5 0 0 1 7 16.5h12.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  filter: 'M3.5 5h17l-6.5 8v6l-4 1.5V13L3.5 5Z',
  plus: 'M12 5v14M5 12h14',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  device: 'M3.5 4.5h17v11h-17zM8 20h8M12 15.5V20',
  building: 'M4.5 21V4.5l8-1.5v18M12.5 8l7 1.5V21M2.5 21h19M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5l1.6 1-2 3.4-1.8-.6a7.5 7.5 0 0 1-2.2 1.3L14.6 21h-4l-.4-2.4A7.5 7.5 0 0 1 8 17.3l-1.8.6-2-3.4 1.6-1a7.6 7.6 0 0 1 0-2.6l-1.6-1 2-3.4 1.8.6a7.5 7.5 0 0 1 2.2-1.3L10.6 3h4l.4 2.4a7.5 7.5 0 0 1 2.2 1.3l1.8-.6 2 3.4-1.6 1a7.6 7.6 0 0 1 0 2.6Z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  play: 'M7 4.5v15l12.5-7.5L7 4.5Z',
  calendar: 'M4 6h16v14.5H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  inbox: 'M3.5 13.5 6 5h12l2.5 8.5v6h-17v-6ZM3.5 13.5h5l1 2.5h5l1-2.5h5',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10',
  products: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM16.5 14v5M14 16.5h5',
  pulse: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  ticket: 'M3.5 7.5h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4v-3ZM14 7.5v10',
  route: 'M6 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.5 17H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5',
  lock: 'M6 11h12v9.5H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  download: 'M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15',
  // device families (TagChip kind="device"): one glyph per V2.5.3 layer, never a drawing of a vendor's product
  display: 'M3 5h18v11H3zM8.5 20h7M12 16v4',
  camera: 'M3.5 7.5h11v9h-11zM14.5 10.5l6-3v9l-6-3',
  mic: 'M12 14.5a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3ZM6 11.5a6 6 0 0 0 12 0M12 17.5v3',
  speaker: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  control: 'M5 3.5h14v17H5zM9 7.5h6M9 11h6M12 16.5h.01',
  network: 'M3.5 14h17v5h-17zM7 16.5h.01M10.5 16.5h.01M12 14V9M6 9h12M6 9V6.5M18 9V6.5',
  power: 'M9 3.5v4M15 3.5v4M6.5 7.5h11v4a5.5 5.5 0 0 1-11 0zM12 17v3.5',
  furniture: 'M4 11h16v3H4zM6 14v6M18 14v6M7 11V7.5h10V11',
  keyboard: 'M3 6.5h18v11H3zM6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8',
} as const;
export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({ name, label, size = 20, className }: { name: IconName; label?: string; size?: number; className?: string }) {
  const d = PATHS[name] ?? PATHS.info;
  return (
    <svg className={className ? `kit-icon ${className}` : 'kit-icon'} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      focusable="false" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} data-icon={name}>
      {label ? <title>{label}</title> : null}
      <path d={d} />
    </svg>
  );
}
