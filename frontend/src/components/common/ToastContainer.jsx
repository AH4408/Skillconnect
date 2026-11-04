import React from 'react';
import { TOAST_ICON } from '../../utils/constants';

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return <div id="toasts"></div>;

  return (
    <div id="toasts">
      {toasts.map(t => {
        const icon = TOAST_ICON[t.kind] || 'fa-circle-info';
        return (
          <div key={t.id} className={`toast ${t.kind} ${t.out ? 'out' : ''}`}>
            <i className={`fas ${icon} t-ico`}></i>
            <span className="flex1">{t.msg}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  onDismiss(t.id);
                  t.action.run();
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

