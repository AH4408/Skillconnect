import React from 'react';
import { STATUS_META } from '../../utils/constants';

export default function StatusBadge({ job }) {
  if (!job) return null;
  const m = STATUS_META[job.status] || { label: job.status, badge: 'badge-neutral', icon: 'fa-circle-info' };
  let label = m.label;
  if (job.status === 'Completed' && !job.confirmedAt) {
    label = 'Awaiting your confirmation';
  }

  return (
    <span className={`badge ${m.badge}`}>
      <i className={`fas ${m.icon}`}></i> {label}
    </span>
  );
}

