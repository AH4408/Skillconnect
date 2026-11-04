import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import VerifyBadge from '../common/VerifyBadge';
import EmptyState from '../common/EmptyState';
import { timeAgo } from '../../utils/formatters';

export default function WorkerHeader() {
  const {
    db,
    sessionUser,
    workerTab,
    setWorkerTab,
    unreadFor,
    notifOpenRole,
    toggleNotifs,
    markAllRead,
    openNotif,
    toggleOnline
  } = useApp();

  const me = sessionUser('worker');
  if (!me) return null;

  const unreadCount = unreadFor(me.id);
  const userNotifs = db.notifications.filter(n => n.userId === me.id).slice(0, 30);

  // Feed count: open jobs in worker's city matching skills
  const feedCount = db.jobs.filter(
    j => j.status === 'Pending' && j.city === me.city && !j.sos && (me.skills || []).includes(j.skill)
  ).length;

  // Pipeline count: active assigned or in progress jobs
  const pipelineCount = db.jobs.filter(
    j => j.workerId === me.id && (j.status === 'Assigned' || j.status === 'InProgress')
  ).length;

  return (
    <header className="app-head">
      <div className="container">
        <div className="app-head-inner">
          <div className="row gap-3">
            <Avatar user={me} />
            <div>
              <p className="eyebrow">Signed in as</p>
              <p style={{ fontWeight: 800, fontSize: '.95rem' }}>{me.name}</p>
            </div>
            {me.verification === 'approved' && (
              <span className="badge badge-info">
                <i className="fas fa-circle-check"></i> Verified
              </span>
            )}
          </div>

          <div className="row gap-3">
            {/* Online / Offline switch with pulsing lamp */}
            <div className={`wk-status ${me.online ? 'online' : ''}`}>
              <span className="lamp"></span>
              <span className="txt">{me.online ? 'ONLINE' : 'OFFLINE'}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!!me.online}
                  onChange={e => toggleOnline(e.target.checked)}
                />
                <span className="track"></span>
              </label>
            </div>

            {/* Notification Bell */}
            <div className="bell" style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => toggleNotifs('worker')}
                aria-label="Notifications"
              >
                <i className="fas fa-bell"></i>
              </button>
              {unreadCount > 0 && (
                <span className="dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}

              {notifOpenRole === 'worker' && (
                <div className="popover">
                  <div className="popover-head">
                    <span className="strong small">Notifications</span>
                    <button
                      className="btn-link"
                      onClick={() => markAllRead('worker')}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="popover-list">
                    {userNotifs.length ? (
                      userNotifs.map(n => (
                        <button
                          key={n.id}
                          className={`notif ${n.read ? '' : 'unread'}`}
                          onClick={() => openNotif(n.id)}
                        >
                          <span className="n-ico">
                            <i className={`fas ${n.icon}`}></i>
                          </span>
                          <span className="flex1">
                            <span className="n-text">{n.text}</span>
                            <span className="n-time">{timeAgo(n.at)}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <EmptyState
                        icon="fa-bell-slash"
                        title="All clear"
                        text="Updates on your jobs land here."
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Worker Navigation Tabs */}
        <div className="tabs" style={{ paddingBottom: '11px' }}>
          <button
            className={`tab ${workerTab === 'dash' ? 'is-on' : ''}`}
            onClick={() => {
              setWorkerTab('dash');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-gauge-high"></i> Dashboard
          </button>
          <button
            className={`tab ${workerTab === 'find' ? 'is-on' : ''}`}
            onClick={() => {
              setWorkerTab('find');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-magnifying-glass-location"></i> Find work{' '}
            <span className="tab-count">{feedCount}</span>
          </button>
          <button
            className={`tab ${workerTab === 'tasks' ? 'is-on' : ''}`}
            onClick={() => {
              setWorkerTab('tasks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-diagram-project"></i> Pipeline{' '}
            <span className="tab-count">{pipelineCount}</span>
          </button>
          <button
            className={`tab ${workerTab === 'earn' ? 'is-on' : ''}`}
            onClick={() => {
              setWorkerTab('earn');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-wallet"></i> Earnings
          </button>
          <button
            className={`tab ${workerTab === 'profile' ? 'is-on' : ''}`}
            onClick={() => {
              setWorkerTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-user-gear"></i> Profile
          </button>
        </div>
      </div>
    </header>
  );
}

