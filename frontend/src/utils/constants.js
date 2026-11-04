/* Reference constants matching sample.html */
export const CATEGORIES = [
  { name: 'Plumbing',          icon: 'fa-faucet-drip',       color: '#2a78d6' },
  { name: 'Electrical',        icon: 'fa-bolt',              color: '#d99a09' },
  { name: 'Carpentry',         icon: 'fa-hammer',            color: '#a16207' },
  { name: 'Painting',          icon: 'fa-paint-roller',      color: '#7c3aed' },
  { name: 'AC Repair',         icon: 'fa-snowflake',         color: '#0891b2' },
  { name: 'Appliance Repair',  icon: 'fa-plug-circle-bolt',  color: '#db2777' },
  { name: 'Cleaning',          icon: 'fa-broom',             color: '#16a34a' },
  { name: 'Pest Control',      icon: 'fa-bug-slash',         color: '#dc2626' },
  { name: 'Masonry',           icon: 'fa-trowel-bricks',     color: '#78716c' },
  { name: 'Gardening',         icon: 'fa-seedling',          color: '#22a55e' },
  { name: 'Moving Help',       icon: 'fa-truck-ramp-box',    color: '#ea580c' },
  { name: 'Vehicle Repair',    icon: 'fa-car-side',          color: '#475569' }
];

export const CITIES = ['Anand', 'Vadodara', 'Ahmedabad', 'Nadiad'];

export const ADMIN_PASSCODE = 'ADMIN2026';

export const STORE_KEY = 'skillconnect.v3';

export const STATUS_META = {
  Pending:    { label: 'Awaiting quotes', badge: 'badge-warn',     icon: 'fa-hourglass-half' },
  Assigned:   { label: 'Assigned',        badge: 'badge-info',     icon: 'fa-clipboard-check' },
  InProgress: { label: 'In progress',     badge: 'badge-serious',  icon: 'fa-person-digging' },
  Completed:  { label: 'Completed',       badge: 'badge-good',     icon: 'fa-circle-check' },
  Cancelled:  { label: 'Cancelled',       badge: 'badge-critical', icon: 'fa-ban' }
};

export const NEXT_STATUS = {
  Assigned: 'InProgress',
  InProgress: 'Completed'
};

export const ROLE_META = {
  client: { label: 'Client',  icon: 'fa-house-chimney-crack', color: '#2563eb' },
  worker: { label: 'Worker',  icon: 'fa-screwdriver-wrench',  color: '#f5a623' },
  admin:  { label: 'Admin',   icon: 'fa-shield-halved',       color: '#5b3df5' }
};

export const ADMIN_PAGES = {
  dashboard:    ['Dashboard', 'Platform health at a glance'],
  verification: ['Verification queue', 'Approve or reject worker identity checks'],
  jobs:         ['Job oversight', 'Every job on the platform, filterable and exportable'],
  disputes:     ['Disputes', 'Escalations from clients and workers'],
  users:        ['Users', 'Clients, workers and administrators'],
  ratings:      ['Ratings', 'Reviews left by clients, with moderation'],
  settings:     ['Settings', 'Categories, cities and platform rules'],
  logs:         ['Activity log', 'Everything that happened, newest first']
};

export const RATE_LABELS = [
  'Tap a star',
  'Poor — would not recommend',
  'Below expectations',
  'It was fine',
  'Good work',
  'Excellent — would book again'
];

export const TOAST_ICON = {
  success: 'fa-circle-check',
  error:   'fa-circle-exclamation',
  warn:    'fa-triangle-exclamation',
  info:    'fa-circle-info'
};

