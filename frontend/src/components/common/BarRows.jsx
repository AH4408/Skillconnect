import React from 'react';
import EmptyState from './EmptyState';

export default function BarRows({ data = [], brand = false, fmt }) {
  if (!data.length) {
    return (
      <EmptyState
        icon="fa-chart-simple"
        title="Nothing to rank yet"
        text="Data appears once jobs are posted."
      />
    );
  }

  const max = Math.max(1, ...data.map(d => d.value));

  return (
    <div>
      {data.map((d, i) => {
        const pct = ((d.value / max) * 100).toFixed(1);
        const formattedVal = fmt ? fmt(d.value) : d.value;

        return (
          <div key={i} className="bar-row">
            <span className="bar-label">{d.label}</span>
            <span className="bar-val">{formattedVal}</span>
            <span className={`meter ${brand ? 'meter-brand' : ''}`}>
              <span
                style={{
                  width: `${pct}%`,
                  background: d.color ? d.color : undefined
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

