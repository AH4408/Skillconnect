import React from 'react';
import { useApp } from '../../context/useApp';
import { ROLE_META } from '../../utils/constants';
import { BACKEND_ENABLED } from '../../services/backendSync';

export default function SessionBar() {
  const { db, view, setView, sessionUser, wipeDemo } = useApp();
  const activeRoles = BACKEND_ENABLED
    ? (view !== 'landing' && sessionUser(view) ? [view] : [])
    : ['client', 'worker', 'admin'].filter(r => sessionUser(r));

  if (!activeRoles.length) return null;

  return (
    <div id="sessionbar">
      <button className="sb-brand" onClick={() => setView('landing')}>
        <i className="fas fa-bolt-lightning"></i> skillConnect
      </button>

      <div id="session-pills" className="sb-pills">
        {activeRoles.map(role => {
          const user = sessionUser(role);
          const meta = ROLE_META[role];
          const isActive = view === role;

          return (
            <button
              key={role}
              className={`sb-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => setView(role)}
            >
              <i className={`fas ${meta.icon}`}></i> {user.name.split(' ')[0]}{' '}
              <span style={{ opacity: 0.6 }}>· {meta.label}</span>
            </button>
          );
        })}
      </div>

      {!BACKEND_ENABLED && <button className="sb-reset" onClick={wipeDemo}>
        <i className="fas fa-rotate-left"></i> <span className="hide-sm">Reset demo</span>
      </button>}
    </div>
  );
}

