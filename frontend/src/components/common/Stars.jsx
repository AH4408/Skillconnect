import React from 'react';

export default function Stars({ rating = 0, className = '', interactive = false, onChange }) {
  const n = Math.round(Number(rating) || 0);

  if (interactive) {
    return (
      <div className={`row gap-2 ${className}`} style={{ justifyContent: 'center', fontSize: '2.1rem', color: 'var(--border-strong)' }}>
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            type="button"
            style={{ color: v <= n ? 'var(--st-warn)' : 'var(--border-strong)', fontSize: 'inherit', padding: 0 }}
            onClick={() => onChange && onChange(v)}
          >
            <i className={`fa${v <= n ? 's' : 'r'} fa-star`}></i>
          </button>
        ))}
      </div>
    );
  }

  return (
    <span className={`stars ${className}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <i key={i} className={`fa${i <= n ? 's' : 'r'} fa-star ${i <= n ? '' : 'off'}`}></i>
      ))}
    </span>
  );
}

