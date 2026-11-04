import React from 'react';
import { useApp } from '../../context/useApp';
import Avatar from '../common/Avatar';
import EmptyState from '../common/EmptyState';
import { timeAgo } from '../../utils/formatters';

export default function ClientHeader() {
  const {
    db,
    sessionUser,
    clientTab,
    setClientTab,
    unreadFor,
    notifOpenRole,
    toggleNotifs,
    markAllRead,
    openNotif,
    updateProfile,
    toast
  } = useApp();

  const me = sessionUser('client');
  if (!me) return null;

  const unreadCount = unreadFor(me.id);
  const userNotifs = db.notifications.filter(n => n.userId === me.id).slice(0, 30);
  const myJobsCount = db.jobs.filter(j => j.clientId === me.id).length;

  const cycleCity = () => {
    const i = db.cities.indexOf(me.city);
    const next = db.cities[(i + 1) % db.cities.length];
    if (!next || next === me.city) {
      toast('Only one city is being served right now.', 'info');
      return;
    }
    updateProfile('client', { city: next });
    toast(`Now browsing ${next}.`, 'info');
  };

  return (
    <header className="app-head">
      <div className="container">
        <div className="app-head-inner">
          <div className="row gap-3">
            <span className="avatar" style={{ background: 'var(--brand)', color: '#fff' }}>
              <i className="fas fa-bolt-lightning"></i>
            </span>
            <div>
              <p className="eyebrow">Your location</p>
              <button
                className="row gap-2"
                onClick={cycleCity}
                style={{ fontWeight: 800, color: 'var(--brand)', fontSize: '.95rem' }}
              >
                <i className="fas fa-location-dot"></i>
                <span>{me.city}</span>
                <i className="fas fa-chevron-down xs"></i>
              </button>
            </div>
          </div>

          <div className="row gap-2">
            {/* Notification Bell */}
            <div className="bell" style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => toggleNotifs('client')}
                aria-label="Notifications"
              >
                <i className="fas fa-bell"></i>
              </button>
              {unreadCount > 0 && (
                <span className="dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}

              {notifOpenRole === 'client' && (
                <div className="popover">
                  <div className="popover-head">
                    <span className="strong small">Notifications</span>
                    <button
                      className="btn-link"
                      onClick={() => markAllRead('client')}
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

            {/* Profile Avatar button */}
            <button
              className="avatar"
              onClick={() => setClientTab('profile')}
              aria-label="Profile"
            >
              <Avatar user={me} />
            </button>
          </div>
        </div>

        {/* Client Navigation Tabs */}
        <div className="tabs" style={{ paddingBottom: '11px' }}>
          <button
            className={`tab ${clientTab === 'home' ? 'is-on' : ''}`}
            onClick={() => {
              setClientTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-house"></i> Home
          </button>
          <button
            className={`tab ${clientTab === 'jobs' ? 'is-on' : ''}`}
            onClick={() => {
              setClientTab('jobs');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-list-check"></i> My jobs{' '}
            <span className="tab-count">{myJobsCount}</span>
          </button>
          <button
            className={`tab ${clientTab === 'workers' ? 'is-on' : ''}`}
            onClick={() => {
              setClientTab('workers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-users"></i> Find workers
          </button>
          <button
            className={`tab ${clientTab === 'profile' ? 'is-on' : ''}`}
            onClick={() => {
              setClientTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-user"></i> Profile
          </button>
        </div>
      </div>
    </header>
  );
}

