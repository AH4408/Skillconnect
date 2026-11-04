import React from 'react';
import { useApp } from '../../context/useApp';

export default function ConfirmModal() {
  const { confirmDialog } = useApp();

  if (!confirmDialog) return null;

  const { title, text, confirmLabel, danger, icon, resolve } = confirmDialog;

  return (
    <div className="modal" onClick={() => resolve(false)}>
      <div
        className="modal-box"
        style={{ maxWidth: '400px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="row gap-3">
            <span
              className="avatar"
              style={{
                background: danger
                  ? 'color-mix(in srgb, var(--st-critical) 15%, var(--surface))'
                  : 'color-mix(in srgb, var(--brand) 14%, var(--surface))',
                color: danger ? 'var(--st-critical)' : 'var(--brand)'
              }}
            >
              <i className={`fas ${icon}`}></i>
            </span>
            <h3>{title}</h3>
          </div>
        </div>

        <div className="modal-body">
          <p className="muted small">{text}</p>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={() => resolve(false)}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => resolve(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

