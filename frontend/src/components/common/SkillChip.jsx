import React from 'react';
import { catMeta } from '../../utils/formatters';

export default function SkillChip({ skill, onRemove, asButton = false, selected = false, onClick }) {
  const m = catMeta(skill);

  if (asButton) {
    return (
      <button
        type="button"
        className={`chip chip-select ${selected ? 'is-on' : ''}`}
        onClick={onClick}
      >
        <i className={`fas ${m.icon}`}></i> {skill}
      </button>
    );
  }

  if (onRemove) {
    return (
      <span className="chip chip-brand">
        <i className={`fas ${m.icon}`}></i> {skill}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove(skill);
          }}
          aria-label={`Remove ${skill}`}
        >
          <i className="fas fa-times"></i>
        </button>
      </span>
    );
  }

  return (
    <span className="badge" style={{ background: `${m.color}1f`, color: m.color }}>
      <i className={`fas ${m.icon}`}></i> {skill}
    </span>
  );
}

