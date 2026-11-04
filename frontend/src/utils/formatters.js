import { CATEGORIES } from './constants';

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const money = n => '₹' + INR.format(Math.round(Number(n) || 0));

export const moneyShort = n => {
  n = Number(n) || 0;
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k';
  return '₹' + INR.format(Math.round(n));
};

export const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export const MIN = 6e4, HOUR = 36e5, DAY = 864e5;

export function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 0) return 'in ' + timeAhead(-d);
  if (d < MIN) return 'just now';
  if (d < HOUR) return Math.floor(d / MIN) + 'm ago';
  if (d < DAY) return Math.floor(d / HOUR) + 'h ago';
  if (d < 7 * DAY) return Math.floor(d / DAY) + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function timeAhead(ms) {
  if (ms < HOUR) return Math.max(1, Math.round(ms / MIN)) + ' min';
  if (ms < DAY) return Math.round(ms / HOUR) + ' hr';
  return Math.round(ms / DAY) + ' days';
}

export const etaLabel = m => m >= 1440 ? 'Tomorrow' : m >= 60 ? 'Within ' + (m / 60) + ' hr' : 'Within ' + m + ' min';

export const dateStr = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const dayKey = ts => {
  const d = new Date(ts);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
};

export const startOfDay = ts => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const pluralise = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));

export const isPhone = v => /^[6-9]\d{9}$/.test(String(v || '').trim());

export const catMeta = name => CATEGORIES.find(c => c.name === name) || { name: name, icon: 'fa-wrench', color: '#64748b' };

export function tierOf(jobsDone) {
  const n = Number(jobsDone) || 0;
  if (n >= 50) return { name: 'Elite',   icon: 'fa-crown' };
  if (n >= 20) return { name: 'Pro',     icon: 'fa-medal' };
  if (n >= 5)  return { name: 'Rising',  icon: 'fa-arrow-trend-up' };
  return { name: 'New', icon: 'fa-seedling' };
}

export function colorFor(key) {
  const palette = [
    ['#e8f0fe', '#1d4ed8'], ['#fff1e6', '#b45309'], ['#e9f9f0', '#0a7a4a'], ['#f3ecfe', '#5b21b6'],
    ['#fdecf3', '#9d174d'], ['#e6f6fb', '#0e7490'], ['#f1f2f6', '#334155'], ['#fef6e0', '#8a6100']
  ];
  let h = 0;
  const s = String(key || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const p = palette[h % palette.length];
  return { bg: p[0], fg: p[1] };
}

