import React, { useState, useRef } from 'react';
import { BACKEND_ENABLED } from '../services/backendSync';
import { useApp } from '../context/useApp';
import WorkerHeader from '../components/layout/WorkerHeader';
import Avatar from '../components/common/Avatar';
import VerifyBadge from '../components/common/VerifyBadge';
import SkillChip from '../components/common/SkillChip';
import Stars from '../components/common/Stars';
import BarChart from '../components/common/BarChart';
import EmptyState from '../components/common/EmptyState';
import { money, moneyShort, timeAgo, dateStr, pluralise, tierOf, isPhone } from '../utils/formatters';
import { NEXT_STATUS } from '../utils/constants';

const DAY = 24 * 60 * 60 * 1000;

export default function WorkerView() {
  const {
    db,
    sessionUser,
    workerTab,
    setWorkerTab,
    workerStats,
    weeklyEarnings,
    openQuoteModal,
    withdrawQuote,
    advanceJob,
    setJobDrawer,
    openChat,
    openDispute,
    toggleOnline,
    addWorkerSkill,
    removeWorkerSkill,
    updateProfile,
    uploadAvatar,
    logout,
    toast
  } = useApp();

  const me = sessionUser('worker');

  // Tab: Find Work state
  const [findSearch, setFindSearch] = useState('');
  const [findSort, setFindSort] = useState('new');

  // Tab: Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(me?.name || '');
  const [editPhone, setEditPhone] = useState(me?.phone || '');
  const [editCity, setEditCity] = useState(me?.city || db.cities[0]);
  const [editArea, setEditArea] = useState(me?.area || '');
  const [editBio, setEditBio] = useState(me?.bio || '');
  const [selectedNewSkill, setSelectedNewSkill] = useState('');
  const [profileErrors, setProfileErrors] = useState({});

  // Drag & Drop State
  const [draggingJobId, setDraggingJobId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const avatarInputRef = useRef(null);

  if (!me) return null;

  const st = workerStats(me.id);
  const tier = tierOf(st.jobsDone);
  const weekData = weeklyEarnings(me.id);
  const weekTotal = weekData.reduce((s, d) => s + d.value, 0);

  const myJobs = db.jobs.filter(j => j.workerId === me.id);
  const pipeline = myJobs.filter(j => ['Assigned', 'InProgress'].includes(j.status));
  const cancelledJobs = db.jobs
    .filter(j => j.status === 'Cancelled' && (
      j.workerId === me.id || db.quotes.some(quote => quote.jobId === j.id && quote.workerId === me.id)
    ))
    .sort((a, b) => (b.cancelledAt || b.createdAt) - (a.cancelledAt || a.createdAt));
  const myQuotes = db.quotes.filter(q => q.workerId === me.id);
  const openQuotesCount = myQuotes.filter(q => q.status === 'Pending').length;
  const assignedCount = myJobs.filter(j => j.status === 'Assigned').length;
  const inProgressCount = myJobs.filter(j => j.status === 'InProgress').length;

  const decidedQuotes = myQuotes.filter(q => ['Accepted', 'Declined'].includes(q.status));
  const wonQuotes = myQuotes.filter(q => q.status === 'Accepted').length;
  const winRate = decidedQuotes.length ? Math.round((wonQuotes / decidedQuotes.length) * 100) + '%' : '—';
  const winRateSub = decidedQuotes.length ? `${wonQuotes} won of ${decidedQuotes.length} decided` : 'No quotes decided yet';

  // SOS Jobs for current worker's city
  const sosJobs = me.online ? db.jobs.filter(j => j.status === 'Pending' && j.sos && j.city === me.city) : [];

  // Feed Jobs matching worker's skills & city
  // In live/backend mode, the backend already returns the authenticated
  // worker's available jobs. Do not apply the old seeded-data skill filter
  // again on the frontend, because it can hide real MongoDB jobs when a
  // worker profile's skills are stale or formatted differently.
  let feedJobs = db.jobs.filter(j =>
    j.status === 'Pending' &&
    j.city === me.city &&
    !j.sos &&
    (BACKEND_ENABLED || (me.skills || []).includes(j.skill))
  );

  if (findSearch.trim()) {
    const q = findSearch.toLowerCase();
    feedJobs = feedJobs.filter(j => (j.title + ' ' + j.desc + ' ' + j.area).toLowerCase().includes(q));
  }

  if (findSort === 'urgent') {
    feedJobs.sort((a, b) => (b.urgent - a.urgent) || (b.createdAt - a.createdAt));
  } else if (findSort === 'budget') {
    feedJobs.sort((a, b) => (b.budget || 0) - (a.budget || 0));
  } else {
    feedJobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Earnings calculations
  const paidJobs = myJobs.filter(j => j.confirmedAt).sort((a, b) => b.confirmedAt - a.confirmedAt);
  const awaitingJobs = myJobs.filter(j => j.status === 'Completed' && !j.confirmedAt);
  const prevWeekTotal = paidJobs
    .filter(j => j.confirmedAt < Date.now() - 7 * DAY && j.confirmedAt >= Date.now() - 14 * DAY)
    .reduce((s, j) => s + (j.price || 0), 0);

  const earningsDelta = prevWeekTotal ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100) : null;
  const avgJobValue = paidJobs.length ? st.earned / paidJobs.length : 0;

  // Available skills to add
  const availableSkillsToAdd = db.categories.filter(c => !(me.skills || []).includes(c));

  // Worker Profile Reviews
  const workerReviews = db.reviews.filter(r => r.workerId === me.id).sort((a, b) => b.at - a.at);

  const handleStartEditProfile = () => {
    setEditName(me.name);
    setEditPhone(me.phone);
    setEditCity(me.city);
    setEditArea(me.area || '');
    setEditBio(me.bio || '');
    setProfileErrors({});
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const errs = {};
    if (editName.trim().length < 3) errs.name = 'Name must be at least 3 characters.';
    const cleanPhone = editPhone.replace(/\D/g, '').slice(0, 10);
    if (!isPhone(cleanPhone)) errs.phone = 'Enter a valid 10-digit mobile number.';
    if (!errs.phone && db.users.some(u => u.phone === cleanPhone && u.id !== me.id)) {
      errs.phone = 'Another account already uses that number.';
    }

    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const cityChanged = me.city !== editCity;
    updateProfile('worker', {
      name: editName.trim(),
      phone: cleanPhone,
      city: editCity,
      area: editArea.trim() || me.area,
      bio: editBio.trim()
    });
    setIsEditingProfile(false);
    if (cityChanged) {
      toast(`Profile updated — your job feed now shows ${editCity}.`, 'success');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, jobId) => {
    setDraggingJobId(jobId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colName) {
      setDragOverCol(colName);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggingJobId) return;

    const job = db.jobs.find(j => j.id === draggingJobId);
    if (!job) return;

    if (NEXT_STATUS[job.status] !== targetCol) {
      toast(
        targetCol === job.status
          ? 'That job is already in this column.'
          : 'Jobs move one stage at a time: Assigned → In progress → Completed.',
        'warn',
        3600
      );
      setDraggingJobId(null);
      return;
    }

    advanceJob(job.id);
    setDraggingJobId(null);
  };

  return (
    <section id="view-worker" className="view">
      <WorkerHeader />

      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files && e.target.files[0];
          if (file) uploadAvatar('worker', file);
          e.target.value = '';
        }}
      />

      {/* TAB 1: DASHBOARD */}
      {workerTab === 'dash' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          {/* Verification Banner if unverified */}
          {me.verification !== 'approved' && (
            <div className="mb-5">
              <div
                className="card card-pad"
                style={{
                  borderColor: `color-mix(in srgb, var(--st-${me.verification === 'rejected' ? 'critical' : 'warn'}) 50%, var(--border))`,
                  background: `color-mix(in srgb, var(--st-${me.verification === 'rejected' ? 'critical' : 'warn'}) 9%, var(--surface))`
                }}
              >
                <div className="row-top gap-3">
                  <i
                    className={`fas ${me.verification === 'rejected' ? 'fa-circle-xmark' : 'fa-hourglass-half'}`}
                    style={{
                      color: `var(--st-${me.verification === 'rejected' ? 'critical' : 'warn'})`,
                      fontSize: '1.1rem',
                      marginTop: '2px'
                    }}
                  />
                  <div className="flex1">
                    <p className="strong">
                      {me.verification === 'rejected' ? 'Verification was rejected' : 'Verification pending review'}
                    </p>
                    <p className="small muted mt-1">
                      {me.verification === 'rejected'
                        ? 'An admin could not verify your documents. You can browse jobs but cannot send quotes until this is resolved.'
                        : 'An admin is reviewing your account. You can browse the job feed now' +
                          (db.settings.requireVerification
                            ? ', and quoting unlocks as soon as you are approved.'
                            : ' and quote in the meantime.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOS Broadcast Alerts */}
          {sosJobs.length > 0 && (
            <div className="col gap-3 mb-5">
              {sosJobs.map(job => {
                const client = db.users.find(u => u.id === job.clientId);
                return (
                  <div key={job.id} className="sos-card">
                    <div className="spread wrap gap-3">
                      <div className="row gap-3">
                        <i className="fas fa-tower-broadcast" style={{ color: 'var(--st-critical)', fontSize: '1.2rem' }}></i>
                        <div>
                          <p className="strong">Emergency in {job.area}</p>
                          <p className="small muted">{client?.name || 'Client'} · {timeAgo(job.createdAt)}</p>
                        </div>
                      </div>
                      <div className="row gap-2">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setJobDrawer({ open: true, jobId: job.id })}
                        >
                          Details
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => openQuoteModal(job.id)}
                        >
                          <i className="fas fa-bolt"></i> Respond
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hero Lifetime Earnings Card */}
          <div className="wk-hero mb-6">
            <div className="spread wrap gap-5" style={{ position: 'relative', zIndex: 2 }}>
              <div>
                <p className="eyebrow">Lifetime earnings</p>
                <p className="num" style={{ fontSize: '2.6rem', color: 'var(--brand)', letterSpacing: '-.04em' }}>
                  {money(st.earned)}
                </p>
                <p className="small muted mt-1">
                  <span>{money(weekTotal)}</span> earned in the last 7 days
                </p>
              </div>

              <div className="grid g3 gap-6" style={{ textAlign: 'right' }}>
                <div>
                  <p className="eyebrow">Rating</p>
                  <p className="num" style={{ fontSize: '1.5rem' }}>{st.ratingLabel}</p>
                  <div className="mt-1">
                    <Stars rating={st.rating} /> <span className="xs dim">{st.reviews}</span>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Jobs done</p>
                  <p className="num" style={{ fontSize: '1.5rem' }}>{st.jobsDone}</p>
                </div>
                <div>
                  <p className="eyebrow">Tier</p>
                  <p className="num" style={{ fontSize: '1.5rem', color: 'var(--brand)' }}>
                    <i className={`fas ${tier.icon}`}></i> {tier.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid g4 mb-6">
            <div className="stat">
              <div className="stat-label">Open quotes</div>
              <div className="stat-value">{openQuotesCount}</div>
              <div className="stat-sub">Awaiting client reply</div>
              <div className="stat-icon"><i className="fas fa-file-invoice-dollar"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">Assigned</div>
              <div className="stat-value">{assignedCount}</div>
              <div className="stat-sub">Ready to start</div>
              <div className="stat-icon"><i className="fas fa-clipboard-check"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">In progress</div>
              <div className="stat-value">{inProgressCount}</div>
              <div className="stat-sub">On site now</div>
              <div className="stat-icon"><i className="fas fa-person-digging"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">Win rate</div>
              <div className="stat-value">{winRate}</div>
              <div className="stat-sub">{winRateSub}</div>
              <div className="stat-icon"><i className="fas fa-trophy"></i></div>
            </div>
          </div>

          {/* Earnings Chart & Next Up list */}
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', alignItems: 'start' }}>
            <div className="card">
              <div className="card-head">
                <h4>Earnings — last 7 days</h4>
                <span className="badge badge-neutral">{money(weekTotal)}</span>
              </div>
              <div className="card-body">
                <BarChart
                  data={weekData}
                  height={200}
                  color="var(--brand)"
                  fmtAxis={moneyShort}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h4>Next up</h4>
                <button
                  className="btn-link"
                  onClick={() => setWorkerTab('tasks')}
                >
                  Pipeline
                </button>
              </div>
              <div className="card-body">
                <div className="col gap-3">
                  {pipeline.length ? (
                    pipeline.slice(0, 3).map(j => {
                      const client = db.users.find(u => u.id === j.clientId);
                      return (
                        <div key={j.id} className="panel">
                          <div className="spread gap-3">
                            <div className="flex1" style={{ minWidth: 0 }}>
                              <p className="small strong truncate">{j.title}</p>
                              <p className="xs dim mt-1">{client?.name || 'Client'} · {j.area}</p>
                            </div>
                            <span className="money" style={{ color: 'var(--brand)' }}>
                              {money(j.price)}
                            </span>
                          </div>
                          <div className="row gap-2 mt-3">
                            {j.status === 'Assigned' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => advanceJob(j.id)}
                              >
                                <i className="fas fa-play"></i> Start job
                              </button>
                            )}
                            {j.status === 'InProgress' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => advanceJob(j.id)}
                              >
                                <i className="fas fa-flag-checkered"></i> Mark complete
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => openChat(j.id)}
                            >
                              <i className="fas fa-comment"></i> Message
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon="fa-mug-hot"
                      title="Nothing scheduled"
                      text="Send quotes on open jobs and accepted work shows up here."
                      action={
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setWorkerTab('find')}
                        >
                          Find work
                        </button>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: FIND WORK */}
      {workerTab === 'find' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          <div className="spread wrap gap-3 mb-4">
            <div>
              <h3>Jobs in {me.city}</h3>
              <p className="small muted">Matched to your skills. SOS jobs always show, regardless of skill.</p>
            </div>
            <div className="row gap-2 wrap">
              <div className="input-icon">
                <i className="fas fa-magnifying-glass"></i>
                <input
                  className="input"
                  type="search"
                  placeholder="Search jobs…"
                  style={{ width: '200px' }}
                  value={findSearch}
                  onChange={e => setFindSearch(e.target.value)}
                />
              </div>

              <select
                className="select"
                style={{ width: 'auto' }}
                value={findSort}
                onChange={e => setFindSort(e.target.value)}
              >
                <option value="new">Newest first</option>
                <option value="urgent">Urgent first</option>
                <option value="budget">Highest budget</option>
              </select>
            </div>
          </div>

          {/* Offline Notice */}
          {!me.online && (
            <div className="mb-4">
              <div className="card card-pad" style={{ borderColor: 'color-mix(in srgb, var(--st-warn) 45%, var(--border))' }}>
                <div className="spread wrap gap-3">
                  <div className="row gap-3">
                    <i className="fas fa-plug-circle-xmark" style={{ color: 'var(--st-warn)', fontSize: '1.1rem' }} />
                    <div>
                      <p className="strong">You are offline</p>
                      <p className="small muted">Clients cannot see you and you cannot send quotes. Go online to start working.</p>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => toggleOnline(true)}>
                    <i className="fas fa-power-off"></i> Go online
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feed List */}
          <div className="col gap-3">
            {feedJobs.length ? (
              feedJobs.map(job => {
                const client = db.users.find(u => u.id === job.clientId);
                const allJobQuotes = db.quotes.filter(q => q.jobId === job.id && q.status === 'Pending');
                const myQuote = allJobQuotes.find(q => q.workerId === me.id);
                const latestMyQuote = db.quotes
                  .filter(q => q.jobId === job.id && q.workerId === me.id)
                  .sort((a, b) => b.createdAt - a.createdAt)[0];
                const myQuoteWasDeclined = !myQuote && latestMyQuote?.status === 'Declined';

                return (
                  <article key={job.id} className={`job-card ${job.urgent ? 'is-urgent' : ''}`}>
                    <div className="jc-top">
                      <div className="flex1" style={{ minWidth: 0 }}>
                        <div className="row gap-2 wrap mb-2">
                          <SkillChip skill={job.skill} />
                          {job.urgent && (
                            <span className="badge badge-critical">
                              <i className="fas fa-fire"></i> Urgent
                            </span>
                          )}
                          {myQuote && (
                            <span className="badge badge-info">
                              <i className="fas fa-paper-plane"></i> You quoted {money(myQuote.price)}
                            </span>
                          )}
                          {myQuoteWasDeclined && (
                            <span className="badge badge-warn">
                              <i className="fas fa-circle-xmark"></i> Quote declined
                            </span>
                          )}
                        </div>
                        <h4 className="truncate">{job.title}</h4>
                        <p className="small muted clamp-2 mt-2">{job.desc}</p>
                      </div>

                      <div className="right shrink0">
                        {job.budget ? (
                          <>
                            <div className="price-tag">{money(job.budget)}</div>
                            <div className="xs dim">client budget</div>
                          </>
                        ) : (
                          <div className="xs dim">no budget set</div>
                        )}
                      </div>
                    </div>

                    <div className="jc-body">
                      <div className="row gap-4 wrap xs dim">
                        <span><i className="fas fa-location-dot"></i> {job.area}</span>
                        <span><i className="fas fa-clock"></i> {timeAgo(job.createdAt)}</span>
                        <span><i className="fas fa-users"></i> {pluralise(allJobQuotes.length, 'quote')}</span>
                        <span><i className="fas fa-user"></i> {client?.name || 'Client'}</span>
                      </div>
                    </div>

                    <div className="jc-foot">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setJobDrawer({ open: true, jobId: job.id })}
                      >
                        <i className="fas fa-eye"></i> Details
                      </button>

                      {myQuote ? (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => withdrawQuote(myQuote.id)}
                        >
                          <i className="fas fa-rotate-left"></i> Withdraw {money(myQuote.price)} quote
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openQuoteModal(job.id)}
                        >
                          <i className="fas fa-file-invoice-dollar"></i> Send a quote
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon="fa-inbox"
                title={findSearch ? 'No jobs match that search' : 'No open jobs right now'}
                text={
                  findSearch
                    ? `Clear the search to see everything open in ${me.city}.`
                    : `You see ${(me.skills || []).join(', ') || 'no skills yet'} jobs in ${me.city}. Add more skills to widen your feed.`
                }
                action={
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setWorkerTab('profile')}
                  >
                    Manage skills
                  </button>
                }
              />
            )}
          </div>
        </main>
      )}

      {/* TAB 3: PIPELINE */}
      {workerTab === 'tasks' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          <div className="spread wrap gap-3 mb-5">
            <div>
              <h3>Job pipeline</h3>
              <p className="small muted">
                Use the buttons, or drag a card one column to the right. Jobs can't skip a stage.
              </p>
            </div>
            <span className="badge badge-neutral">
              <i className="fas fa-circle-info"></i> Assigned → In progress → Completed
            </span>
          </div>

          <div className="board">
            {['Assigned', 'InProgress', 'Completed'].map(col => {
              const colJobs = myJobs
                .filter(j => j.status === col)
                .sort((a, b) => (b.assignedAt || b.createdAt) - (a.assignedAt || a.createdAt))
                .slice(0, col === 'Completed' ? 12 : 50);

              const dotColor =
                col === 'Assigned'
                  ? 'var(--series-1)'
                  : col === 'InProgress'
                  ? 'var(--st-warn)'
                  : 'var(--st-good)';

              const isDragOver = dragOverCol === col;

              return (
                <div
                  key={col}
                  className={`board-col ${isDragOver ? 'drop-ok' : ''}`}
                  onDragOver={e => handleDragOver(e, col)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col)}
                >
                  <div className="board-head">
                    <span className="t">
                      <span className="dotc" style={{ background: dotColor }}></span>{' '}
                      {col === 'InProgress' ? 'In progress' : col}
                    </span>
                    <span className="badge badge-neutral">{colJobs.length}</span>
                  </div>

                  <div className="board-body">
                    {colJobs.length ? (
                      colJobs.map(j => {
                        const client = db.users.find(u => u.id === j.clientId);
                        const movable = !!NEXT_STATUS[j.status];
                        const isDragging = draggingJobId === j.id;

                        return (
                          <div
                            key={j.id}
                            className={`task-card ${isDragging ? 'dragging' : ''}`}
                            draggable={movable}
                            onDragStart={e => handleDragStart(e, j.id)}
                            onDragEnd={() => setDraggingJobId(null)}
                          >
                            <div className="spread gap-2">
                              <span className="small strong truncate flex1">{j.title}</span>
                              <span className="money xs" style={{ color: 'var(--brand)' }}>
                                {money(j.price)}
                              </span>
                            </div>
                            <p className="xs dim mt-1">{client?.name || 'Client'} · {j.area}</p>

                            {j.status === 'Completed' && !j.confirmedAt && (
                              <p className="xs mt-2" style={{ color: 'var(--st-warn)' }}>
                                <i className="fas fa-hourglass-half"></i> Awaiting client confirmation
                              </p>
                            )}

                            {j.status === 'Completed' && j.confirmedAt && (
                              <p className="xs mt-2" style={{ color: 'var(--st-good)' }}>
                                <i className="fas fa-circle-check"></i> Paid {money(j.price)}
                              </p>
                            )}

                            <div className="row gap-2 mt-3">
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setJobDrawer({ open: true, jobId: j.id })}
                              >
                                Open
                              </button>
                              {movable && (
                                <button
                                  className="btn btn-sm btn-primary flex1"
                                  onClick={() => advanceJob(j.id)}
                                >
                                  {j.status === 'Assigned' ? 'Start' : 'Complete'}{' '}
                                  <i className="fas fa-arrow-right"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="xs dim center" style={{ padding: 'var(--sp-6) var(--sp-3)' }}>
                        {col === 'Assigned'
                          ? 'Accepted quotes land here.'
                          : col === 'InProgress'
                          ? 'Start a job to move it here.'
                          : 'Finished jobs appear here.'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {cancelledJobs.length > 0 && (
            <section className="card card-pad mt-5">
              <div className="spread wrap gap-3 mb-3">
                <div>
                  <h4>Cancelled jobs</h4>
                  <p className="small muted">Jobs cancelled by the client or platform administration.</p>
                </div>
                <span className="badge badge-critical">{cancelledJobs.length}</span>
              </div>
              <div className="col gap-2">
                {cancelledJobs.map(job => {
                  const client = db.users.find(user => user.id === job.clientId);
                  return (
                    <div key={job.id} className="panel spread wrap gap-3">
                      <div className="flex1" style={{ minWidth: 0 }}>
                        <p className="strong truncate">{job.title}</p>
                        <p className="xs dim mt-1">{client?.name || 'Client'} · {job.cancelReason || 'Cancelled'}</p>
                      </div>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setJobDrawer({ open: true, jobId: job.id })}
                      >
                        View details
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      )}

      {/* TAB 4: EARNINGS */}
      {workerTab === 'earn' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          <div className="grid g4 mb-6">
            <div className="stat stat-accent">
              <div className="stat-label">Lifetime</div>
              <div className="stat-value money">{money(st.earned)}</div>
              <div className="stat-icon"><i className="fas fa-sack-dollar"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">Last 7 days</div>
              <div className="stat-value money">{money(weekTotal)}</div>
              <div className="stat-sub">
                {earningsDelta !== null ? (
                  <span className={earningsDelta >= 0 ? 'delta-up' : 'delta-down'}>
                    <i className={`fas fa-arrow-${earningsDelta >= 0 ? 'up' : 'down'}`}></i>{' '}
                    {Math.abs(earningsDelta)}% vs previous 7 days
                  </span>
                ) : (
                  'No prior week to compare'
                )}
              </div>
              <div className="stat-icon"><i className="fas fa-calendar-week"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">Awaiting payout</div>
              <div className="stat-value money">{money(st.pending)}</div>
              <div className="stat-sub">Jobs done, not yet confirmed</div>
              <div className="stat-icon"><i className="fas fa-hourglass-half"></i></div>
            </div>

            <div className="stat">
              <div className="stat-label">Avg. job value</div>
              <div className="stat-value money">{money(avgJobValue)}</div>
              <div className="stat-icon"><i className="fas fa-chart-simple"></i></div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h4>Payment history</h4>
              <span className="small muted">{pluralise(paidJobs.length, 'job')}</span>
            </div>
            <div className="card-body">
              <div className="col">
                {[...awaitingJobs, ...paidJobs].length ? (
                  [...awaitingJobs, ...paidJobs].slice(0, 40).map(j => {
                    const client = db.users.find(u => u.id === j.clientId);
                    const done = !!j.confirmedAt;

                    return (
                      <div key={j.id} className="earn-row">
                        <div className="row gap-3 flex1" style={{ minWidth: 0 }}>
                          <Avatar user={client} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <p className="small strong truncate">{j.title}</p>
                            <p className="xs dim">
                              {client?.name || 'Client'} · {dateStr(j.confirmedAt || j.completedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="right">
                          <p
                            className={`money ${done ? '' : 'dim'}`}
                            style={done ? { color: 'var(--st-good)' } : undefined}
                          >
                            {money(j.price)}
                          </p>
                          <p className="xs dim">{done ? 'Paid' : 'Pending confirmation'}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    icon="fa-receipt"
                    title="No earnings yet"
                    text="Completed and confirmed jobs are listed here with their payout."
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* TAB 5: PROFILE */}
      {workerTab === 'profile' && (
        <main className="container container-sm" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          {/* Main Profile Info Card */}
          <div className="card mb-5">
            <div className="card-body">
              <div className="row gap-4 mb-5">
                <div style={{ position: 'relative' }}>
                  <Avatar user={me} size="xl" />
                  <button
                    className="btn btn-primary btn-icon btn-sm"
                    style={{ position: 'absolute', bottom: '-2px', right: '-2px', borderRadius: '50%' }}
                    onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                    aria-label="Change photo"
                  >
                    <i className="fas fa-camera"></i>
                  </button>
                </div>
                <div className="flex1">
                  <h3>{me.name}</h3>
                  <p className="small muted">
                    <i className="fas fa-location-dot"></i> {me.area}, {me.city}
                  </p>
                  <div className="row gap-2 mt-2 wrap">
                    <VerifyBadge worker={me} />
                    <span className="badge badge-brand">
                      <i className={`fas ${tier.icon}`}></i> {tier.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid g3 mb-5" style={{ textAlign: 'center' }}>
                <div className="panel">
                  <p className="num" style={{ fontSize: '1.35rem', color: 'var(--brand)' }}>
                    {st.ratingLabel}
                  </p>
                  <p className="eyebrow mt-1">Rating</p>
                </div>
                <div className="panel">
                  <p className="num" style={{ fontSize: '1.35rem' }}>
                    {st.jobsDone}
                  </p>
                  <p className="eyebrow mt-1">Jobs done</p>
                </div>
                <div className="panel">
                  <p className="num money" style={{ fontSize: '1.35rem' }}>
                    {money(st.earned)}
                  </p>
                  <p className="eyebrow mt-1">Earned</p>
                </div>
              </div>

              {!isEditingProfile ? (
                <div className="col gap-1">
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Phone</span>
                    <span className="small strong mono">+91 {me.phone}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Service area</span>
                    <span className="small strong">{me.area}, {me.city}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Member since</span>
                    <span className="small strong">{dateStr(me.createdAt)}</span>
                  </div>
                  <div style={{ padding: '11px 0' }}>
                    <p className="small muted mb-1">About</p>
                    <p className="small">
                      {me.bio || 'No description yet — clients are more likely to pick workers who write one.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="col gap-4">
                  <div className="field">
                    <label className="label">Full name</label>
                    <input
                      className={`input ${profileErrors.name ? 'input-err' : ''}`}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    {profileErrors.name && (
                      <p className="err-msg">
                        <i className="fas fa-circle-exclamation"></i> {profileErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="field">
                    <label className="label">Phone</label>
                    <input
                      className={`input mono ${profileErrors.phone ? 'input-err' : ''}`}
                      maxLength={10}
                      inputMode="numeric"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    {profileErrors.phone && (
                      <p className="err-msg">
                        <i className="fas fa-circle-exclamation"></i> {profileErrors.phone}
                      </p>
                    )}
                  </div>

                  <div className="grid g2">
                    <div className="field">
                      <label className="label">City served</label>
                      <select
                        className="select"
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                      >
                        {db.cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">Area</label>
                      <input
                        className="input"
                        value={editArea}
                        onChange={e => setEditArea(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">About you</label>
                    <textarea
                      className="textarea"
                      maxLength={220}
                      placeholder="Tell clients what you're good at…"
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="row gap-3 mt-5">
                {!isEditingProfile ? (
                  <button
                    className="btn btn-primary flex1"
                    onClick={handleStartEditProfile}
                  >
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-primary flex1"
                      onClick={handleSaveProfile}
                    >
                      <i className="fas fa-check"></i> Save changes
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  className="btn btn-outline flex1"
                  onClick={() => logout('worker')}
                >
                  <i className="fas fa-right-from-bracket"></i> Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Skills Management Card */}
          <div className="card mb-5">
            <div className="card-head">
              <div>
                <h4>Your skills</h4>
                <p className="xs muted mt-1">You only see jobs matching these.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="row wrap gap-2 mb-4">
                {(me.skills || []).length ? (
                  me.skills.map(s => (
                    <SkillChip
                      key={s}
                      skill={s}
                      onRemove={() => removeWorkerSkill(s)}
                    />
                  ))
                ) : (
                  <p className="small dim">
                    No skills yet — your job feed is empty until you add one.
                  </p>
                )}
              </div>

              <div className="row gap-2">
                <select
                  className="select flex1"
                  disabled={!availableSkillsToAdd.length}
                  value={selectedNewSkill || (availableSkillsToAdd[0] || '')}
                  onChange={e => setSelectedNewSkill(e.target.value)}
                >
                  {availableSkillsToAdd.length ? (
                    availableSkillsToAdd.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  ) : (
                    <option>All skills added</option>
                  )}
                </select>
                <button
                  className="btn btn-primary"
                  disabled={!availableSkillsToAdd.length}
                  onClick={() => {
                    const skill = selectedNewSkill || availableSkillsToAdd[0];
                    if (skill) {
                      addWorkerSkill(skill);
                      setSelectedNewSkill('');
                    }
                  }}
                >
                  <i className="fas fa-plus"></i> Add
                </button>
              </div>
            </div>
          </div>

          {/* Reviews List Card */}
          <div className="card">
            <div className="card-head">
              <h4>Reviews</h4>
              <span className="small muted">{pluralise(workerReviews.length, 'review')}</span>
            </div>
            <div className="card-body">
              <div className="col gap-3">
                {workerReviews.length ? (
                  workerReviews.slice(0, 10).map(r => {
                    const client = db.users.find(u => u.id === r.clientId);
                    const job = db.jobs.find(j => j.id === r.jobId);

                    return (
                      <div key={r.id} className="panel">
                        <div className="spread gap-3">
                          <div className="row gap-2">
                            <Avatar user={client} size="sm" />
                            <div>
                              <p className="small strong">{client?.name || 'Client'}</p>
                              <p className="xs dim">{job?.title || 'Job removed'}</p>
                            </div>
                          </div>
                          <div className="right">
                            <Stars rating={r.stars} />
                            <p className="xs dim mt-1">{timeAgo(r.at)}</p>
                          </div>
                        </div>
                        {r.text && <p className="small mt-2">“{r.text}”</p>}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    icon="fa-star"
                    title="No reviews yet"
                    text="Finish your first job and the client's rating shows up here."
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </section>
  );
}

