/** The 27 destinations of the Founder Studio (directive section 5), in the order they appear in the rail. */
export interface Destination {
  path: string;
  label: string;
  group: 'Start' | 'Seven operational products' | 'Expansion products' | 'Experience' | 'Engineering' | 'Vault';
  /** product slug when the destination is a product page */
  product?: string;
  blurb: string;
}

export const DESTINATIONS: Destination[] = [
  { path: 'mission-control', label: 'Mission Control', group: 'Start', blurb: 'The whole ecosystem at a glance, honestly labelled.' },
  { path: 'enterprise-platform', label: 'The Enterprise Platform', group: 'Start', blurb: 'The seven operational products as one lifecycle, and the production starter.' },
  { path: 'build-a-room', label: 'Build a Room with Lite', group: 'Start', product: 'lite', blurb: 'Design a room and watch it reach drawings, commissioning, Search Party and Pro.' },
  { path: 'search-party', label: 'Search Party', group: 'Seven operational products', product: 'search-party', blurb: 'People, ownership and relationships.' },
  { path: 'pro', label: 'Empathia Pro', group: 'Seven operational products', product: 'pro', blurb: 'The operational view.' },
  { path: 'commissioning', label: 'Universal Commissioning', group: 'Seven operational products', product: 'commissioning', blurb: 'The right tests and their evidence.' },
  { path: 'assurance', label: 'Assurance / APEX', group: 'Seven operational products', product: 'assurance', blurb: 'Baselines, drift and diagnosis.' },
  { path: 'field-intelligence', label: 'Field Intelligence', group: 'Seven operational products', product: 'field-intelligence', blurb: 'Authorized discovery and safe measurement planning.' },
  { path: 'servicehands', label: 'ServiceHands', group: 'Seven operational products', product: 'servicehands', blurb: 'Field changes done properly.' },
  { path: 'intake', label: 'Intake Portal', group: 'Seven operational products', product: 'intake', blurb: 'Requests to funded decisions.' },
  { path: 'drawing-intelligence', label: 'Drawing Intelligence', group: 'Expansion products', product: 'drawing-intelligence', blurb: 'Drawings and revision checks.' },
  { path: 'scouter', label: 'Scouter', group: 'Expansion products', product: 'scouter', blurb: 'Explained equipment shortlists.' },
  { path: 'procurement', label: 'Procurement', group: 'Expansion products', product: 'procurement', blurb: 'Budgets and delivery.' },
  { path: 'control-studio', label: 'Control Studio', group: 'Expansion products', product: 'control-studio', blurb: 'Room control, simulated.' },
  { path: 'learn', label: 'Learn', group: 'Expansion products', product: 'learn', blurb: 'Cases, labs and practice.' },
  { path: 'signal', label: 'SIGNAL', group: 'Expansion products', product: 'signal', blurb: 'Story mode.' },
  { path: 'onboard', label: 'Onboard', group: 'Expansion products', product: 'onboard', blurb: 'A new hire’s first milestone.' },
  { path: 'experiences', label: 'Experiences', group: 'Expansion products', product: 'experiences', blurb: 'Guided tours; UE5 planned.' },
  { path: 'collaboro-sing', label: 'Collaboro-Sing', group: 'Expansion products', product: 'collaboro-sing', blurb: 'Remote rehearsal.' },
  { path: 'frontline', label: 'Frontline', group: 'Expansion products', product: 'frontline', blurb: 'Frontline teams.' },
  { path: 'scenarios', label: 'Interactive Scenarios', group: 'Experience', blurb: 'Step-by-step journeys through the real pages.' },
  { path: 'media', label: 'Media Library', group: 'Experience', blurb: 'Every finished film, with its rights status.' },
  { path: 'architecture', label: 'Architecture Explorer', group: 'Engineering', blurb: 'How it connects, and the actual source code.' },
  { path: 'docs', label: 'Engineering Documentation', group: 'Engineering', blurb: 'The blueprint for a software team.' },
  { path: 'maturity', label: 'Product Maturity', group: 'Engineering', blurb: 'Eighteen products against eight evidence states.' },
  { path: 'vault', label: 'IP & Provenance Vault', group: 'Vault', blurb: 'Records for counsel: source, authorship, licences.' },
  { path: 'settings', label: 'Settings and Demo Reset', group: 'Vault', blurb: 'Appearance, data inspection, export and reset.' },
];

export const GROUPS: Destination['group'][] = ['Start', 'Seven operational products', 'Expansion products', 'Experience', 'Engineering', 'Vault'];
