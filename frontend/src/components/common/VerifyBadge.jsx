import React from 'react';

export default function VerifyBadge({ worker }) {
  if (!worker) return null;
  if (worker.verification === 'approved') {
    return (
      <span className="badge badge-info">
        <i className="fas fa-circle-check"></i> Verified
      </span>
    );
  }
  if (worker.verification === 'rejected') {
    return (
      <span className="badge badge-critical">
        <i className="fas fa-circle-xmark"></i> Rejected
      </span>
    );
  }
  return (
    <span className="badge badge-warn">
      <i className="fas fa-hourglass-half"></i> Pending review
    </span>
  );
}

