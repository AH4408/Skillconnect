import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';

export default function AdminSidebar({ isOpen, onClose }) {
  const { db, adminPage, setAdminPage, sessionUser, logout } = useApp();
  const me = sessionUser('admin');

  const pendingVerifCount = db.users.filter(u => u.role === 'worker' && u.verification === 'pending').length;
  const openDisputesCount = db.disputes.filter(d => d.status === 'Open').length;

  const navigateTo = page => {
    setAdminPage(page);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Scrim */}
      <div
        className={`admin-scrim ${isOpen ? '' : 'hide'}`}
        onClick={onClose}
      />

      <aside className={`admin-side ${isOpen ? 'open' : ''}`} id="admin-side">
        <div className="admin-brand">
          <span className="mark">
            <i className="fas fa-shield-halved"></i>
          </span>
          <div className="flex1">
            <p style={{ fontWeight: 800, letterSpacing: '-.02em' }}>skillConnect</p>
            <p className="xs dim">Operations console</p>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            style={{ display: isOpen ? 'flex' : 'none' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="admin-nav">
          <p className="nav-sec" style={{ paddingTop: 'var(--sp-2)' }}>Overview</p>
          <a
            href="#dashboard"
            className={adminPage === 'dashboard' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('dashboard');
            }}
          >
            <i className="fas fa-chart-line"></i> Dashboard
          </a>

          <p className="nav-sec">Operations</p>
          <a
            href="#verification"
            className={adminPage === 'verification' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('verification');
            }}
          >
            <i className="fas fa-user-check"></i> Verification
            {pendingVerifCount > 0 && <span className="pill">{pendingVerifCount}</span>}
          </a>

          <a
            href="#jobs"
            className={adminPage === 'jobs' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('jobs');
            }}
          >
            <i className="fas fa-briefcase"></i> Job oversight
          </a>

          <a
            href="#disputes"
            className={adminPage === 'disputes' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('disputes');
            }}
          >
            <i className="fas fa-scale-balanced"></i> Disputes
            {openDisputesCount > 0 && <span className="pill">{openDisputesCount}</span>}
          </a>

          <p className="nav-sec">Community</p>
          <a
            href="#users"
            className={adminPage === 'users' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('users');
            }}
          >
            <i className="fas fa-users"></i> Users
          </a>

          <a
            href="#ratings"
            className={adminPage === 'ratings' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('ratings');
            }}
          >
            <i className="fas fa-star-half-stroke"></i> Ratings
          </a>

          <p className="nav-sec">System</p>
          <a
            href="#settings"
            className={adminPage === 'settings' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('settings');
            }}
          >
            <i className="fas fa-sliders"></i> Settings
          </a>

          <a
            href="#logs"
            className={adminPage === 'logs' ? 'is-on' : ''}
            onClick={e => {
              e.preventDefault();
              navigateTo('logs');
            }}
          >
            <i className="fas fa-terminal"></i> Activity log
          </a>
        </nav>

        <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
          <div className="row gap-3 mb-3">
            <Avatar user={me} size="sm" />
            <div className="flex1" style={{ minWidth: 0 }}>
              <p className="small strong truncate">{me?.name || 'Administrator'}</p>
              <p className="xs dim">Administrator</p>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm btn-block"
            onClick={() => logout('admin')}
          >
            <i className="fas fa-right-from-bracket"></i> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

