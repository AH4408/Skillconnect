import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/useApp';
import { workers as workersApi, reviews as reviewsApi } from '../services/domain';
import { BACKEND_ENABLED } from '../services/backendSync';
import { connectRealtime } from '../services/realtime';
import ClientHeader from '../components/layout/ClientHeader';
import Avatar from '../components/common/Avatar';
import StatusBadge from '../components/common/StatusBadge';
import SkillChip from '../components/common/SkillChip';
import Stars from '../components/common/Stars';
import EmptyState from '../components/common/EmptyState';
import { money, timeAgo, dateStr, pluralise, catMeta, isPhone, tierOf } from '../utils/formatters';

export default function ClientView() {
  const {
    db,
    sessionUser,
    clientTab,
    setClientTab,
    clientStats,
    openPostJob,
    sendSos,
    openOffers,
    setJobDrawer,
    setWorkerDrawer,
    openChat,
    confirmDone,
    openRate,
    cancelJob,
    openDispute,
    updateProfile,
    deleteAccount,
    uploadAvatar,
    logout,
    toast
  } = useApp();

  const me = sessionUser('client');

  // Tab: Home state
  const [catSearch, setCatSearch] = useState('');

  // Tab: My Jobs state
  const [jobFilter, setJobFilter] = useState('all');

  // Tab: Find Workers state
  const [dirSkill, setDirSkill] = useState('all');
  const [dirSort, setDirSort] = useState('rating');
  const [dirOnline, setDirOnline] = useState(false);
  const [backendDirectory, setBackendDirectory] = useState([]);
  const [backendDirectoryReviews, setBackendDirectoryReviews] = useState([]);
  const [presenceUpdates, setPresenceUpdates] = useState({});
  const [directorySnapshotAt, setDirectorySnapshotAt] = useState(0);

  // Load directory cards from the directory API itself. This keeps the Find
  // workers view in sync even when the broader client hydration is incomplete.
  useEffect(() => {
    if (!BACKEND_ENABLED || clientTab !== 'workers' || !me?.id) return undefined;
    let cancelled = false;
    const loadDirectory = async () => {
      const requestStartedAt = Date.now();
      let results = await workersApi.search({ city: me.city || undefined }).catch(() => null);
      if (!Array.isArray(results) || results.length === 0) {
        const allWorkers = await workersApi.search({}).catch(() => null);
        if (Array.isArray(allWorkers) && allWorkers.length) results = allWorkers;
      }
      if (!Array.isArray(results) || cancelled) return;

      const directoryUsers = results.map(worker => {
        const account = worker.user && typeof worker.user === 'object' ? worker.user : {};
        return {
          id: String(worker.userId || account._id || worker.user || worker._id),
          name: worker.name || account.name || worker.fullName || 'Worker',
          email: worker.email || account.email || '',
          role: 'worker',
          city: worker.city || account.city || '',
          area: worker.area || '',
          skills: worker.skills || [],
          bio: worker.bio || '',
          verification: worker.verification || 'pending',
          online: Boolean(worker.online ?? worker.availability),
          createdAt: new Date(worker.createdAt || Date.now()).getTime(),
          suspended: false
        };
      }).filter(worker => worker.id && worker.id !== '[object Object]');

      const reviewGroups = await Promise.all(directoryUsers.map(worker =>
        reviewsApi.worker(worker.id).catch(() => [])
      ));
      const directoryReviews = reviewGroups.flat().map(review => ({
        id: String(review._id || review.id || ''),
        jobId: String(review.job?._id || review.job || ''),
        workerId: String(review.worker?._id || review.worker || ''),
        clientId: String(review.client?._id || review.client || ''),
        stars: Number(review.rating || 0),
        text: review.comment || '',
        at: new Date(review.createdAt || Date.now()).getTime()
      })).filter(review => review.id);

      if (!cancelled) {
        setBackendDirectory(directoryUsers);
        setBackendDirectoryReviews(directoryReviews);
        setDirectorySnapshotAt(requestStartedAt);
      }
    };
    loadDirectory();
    return () => {
      cancelled = true;
    };
  }, [clientTab, me?.id, me?.city]);

  // Keep presence events attached while the client moves between tabs. The
  // API supplies the initial snapshot; Socket.IO carries subsequent changes.
  useEffect(() => {
    if (!BACKEND_ENABLED || !me?.id) return undefined;
    const socket = connectRealtime();
    const onWorkerAvailability = ({ workerId, availability }) => {
      if (!workerId) return;
      setPresenceUpdates(previous => ({
        ...previous,
        [String(workerId)]: { availability: Boolean(availability), at: Date.now() }
      }));
    };
    socket?.on('worker:availability', onWorkerAvailability);
    return () => socket?.off('worker:availability', onWorkerAvailability);
  }, [me?.id]);

  // Tab: Profile Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(me?.name || '');
  const [editPhone, setEditPhone] = useState(me?.phone || '');
  const [editCity, setEditCity] = useState(me?.city || '');
  const [editArea, setEditArea] = useState(me?.area || '');
  const [profileErrors, setProfileErrors] = useState({});

  const avatarInputRef = useRef(null);

  if (!me) return null;

  const sameCity = city => Boolean(String(me.city || '').trim())
    && String(city || '').trim().toLocaleLowerCase() === String(me.city || '').trim().toLocaleLowerCase();

  const backendWorkerIds = new Set(backendDirectory.map(worker => String(worker.id)));
  const directoryUsers = backendDirectory.length
    ? [
      ...db.users.filter(user => user.role !== 'worker' || !backendWorkerIds.has(String(user.id))),
      ...backendDirectory.map(worker => {
        // Use the current API snapshot when revisiting the tab, then overlay
        // any newer Socket.IO status events received since that request began.
        const update = presenceUpdates[String(worker.id)];
        const online = update && update.at > directorySnapshotAt
          ? update.availability
          : worker.online;
        return { ...worker, online };
      })
    ]
    : db.users;
  const directoryReviews = backendDirectory.length
    ? [...db.reviews.filter(review => !backendWorkerIds.has(String(review.workerId))), ...backendDirectoryReviews]
    : db.reviews;

  const st = clientStats(me.id);
  const myJobs = db.jobs
    .filter(j => j.clientId === me.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  // Category search filter
  const filteredCategories = db.categories.filter(c =>
    !catSearch || c.toLowerCase().includes(catSearch.toLowerCase())
  );

  // Top rated workers in client city
  const topWorkers = db.users
    .filter(u => u.role === 'worker' && !u.suspended && sameCity(u.city) && u.verification === 'approved')
    .map(u => {
      const revs = db.reviews.filter(r => r.workerId === u.id);
      const rating = revs.length ? revs.reduce((s, r) => s + r.stars, 0) / revs.length : 0;
      const jobsDone = db.jobs.filter(j => j.workerId === u.id && j.status === 'Completed').length;
      return {
        u,
        rating,
        reviewsCount: revs.length,
        jobsDone,
        ratingLabel: revs.length ? rating.toFixed(1) : '—'
      };
    })
    .filter(x => !(x.reviewsCount && x.rating < 3.5))
    .sort((a, b) => b.rating - a.rating || b.jobsDone - a.jobsDone)
    .slice(0, 3);

  // Filtered my jobs
  const filteredJobs = myJobs.filter(j => {
    if (jobFilter === 'all') return true;
    if (jobFilter === 'open') return j.status === 'Pending';
    if (jobFilter === 'active') return ['Assigned', 'InProgress'].includes(j.status) || (j.status === 'Completed' && !j.confirmedAt);
    return j.status === jobFilter;
  });

  // Total quotes waiting across open jobs
  const openJobs = myJobs.filter(j => j.status === 'Pending');
  const totalQuotesWaiting = openJobs.reduce(
    (sum, j) => sum + db.quotes.filter(q => q.jobId === j.id && q.status === 'Pending').length,
    0
  );

  // Needs Attention Strip items
  const needsAttentionJobs = myJobs.filter(j => {
    const quotes = db.quotes.filter(q => q.jobId === j.id && q.status === 'Pending');
    const isCompletedUnconfirmed = j.status === 'Completed' && !j.confirmedAt;
    const isCompletedConfirmedUnreviewed = j.status === 'Completed' && j.confirmedAt && !db.reviews.some(r => r.jobId === j.id);
    return (j.status === 'Pending' && quotes.length > 0) || isCompletedUnconfirmed || isCompletedConfirmedUnreviewed;
  });

  const runningJobs = myJobs.filter(j => ['Assigned', 'InProgress'].includes(j.status));

  // Directory workers
  let dirWorkers = directoryUsers.filter(u => u.role === 'worker' && !u.suspended && sameCity(u.city));
  if (dirSkill !== 'all') {
    dirWorkers = dirWorkers.filter(u => (u.skills || []).includes(dirSkill));
  }
  if (dirOnline) {
    dirWorkers = dirWorkers.filter(u => u.online);
  }

  const dirWorkerRows = dirWorkers.map(u => {
    const revs = directoryReviews.filter(r => String(r.workerId) === String(u.id));
    const rating = revs.length ? revs.reduce((s, r) => s + r.stars, 0) / revs.length : 0;
    const jobsDone = db.jobs.filter(j => j.workerId === u.id && j.status === 'Completed').length;
    return {
      u,
      rating,
      reviewsCount: revs.length,
      jobsDone,
      ratingLabel: revs.length ? rating.toFixed(1) : '—'
    };
  });

  if (dirSort === 'rating') {
    dirWorkerRows.sort((a, b) => b.rating - a.rating || b.jobsDone - a.jobsDone);
  } else if (dirSort === 'jobs') {
    dirWorkerRows.sort((a, b) => b.jobsDone - a.jobsDone);
  } else {
    dirWorkerRows.sort((a, b) => b.u.createdAt - a.u.createdAt);
  }

  const handleStartEditProfile = () => {
    setEditName(me.name);
    setEditPhone(me.phone);
    setEditCity(me.city || '');
    setEditArea(me.area || '');
    setProfileErrors({});
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const errs = {};
    if (editName.trim().length < 3) errs.name = 'Name must be at least 3 characters.';
    const cleanPhone = editPhone.replace(/\D/g, '').slice(0, 10);
    if (!isPhone(cleanPhone)) errs.phone = 'Enter a valid 10-digit mobile number.';
    if (!errs.phone && db.users.some(u => u.phone === cleanPhone && u.id !== me.id)) {
      errs.phone = 'Another account already uses that number.';
    }

    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const saved = await updateProfile('client', {
      name: editName.trim(),
      phone: cleanPhone,
      city: editCity,
      area: editArea.trim() || me.area
    });
    if (saved) setIsEditingProfile(false);
  };

  const renderWorkerCard = (w, workerInfo) => {
    const tier = tierOf(workerInfo.jobsDone);
    return (
      <div key={w.id} className="card card-pad card-hover worker-card">
        <div className="row-top gap-3">
          <Avatar user={w} size="lg" />
          <div className="flex1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ minWidth: 0 }}>
              <span className="strong truncate">{w.name}</span>
              {w.verification === 'approved' && (
                <i
                  className="fas fa-circle-check shrink0"
                  style={{ color: 'var(--brand)', fontSize: '.75rem' }}
                  title="Verified"
                />
              )}
            </div>
            {workerInfo.reviewsCount ? (
              <div className="row gap-2 mt-1">
                <Stars rating={workerInfo.rating} />
                <span className="xs dim">
                  {workerInfo.ratingLabel} · {pluralise(workerInfo.reviewsCount, 'review')}
                </span>
              </div>
            ) : (
              <p className="xs dim mt-1">
                <i className="fas fa-seedling"></i> New — no reviews yet
              </p>
            )}
            <p className="xs dim mt-1 truncate">
              <i className="fas fa-location-dot"></i> {w.area}
            </p>
          </div>
        </div>

        <div className="row wrap gap-2 mt-3">
          {(w.skills || []).slice(0, 3).map(skill => (
            <SkillChip key={skill} skill={skill} />
          ))}
        </div>

        <div className="row wrap gap-3 mt-3 xs dim">
          <span>
            <i className="fas fa-briefcase"></i> {pluralise(workerInfo.jobsDone, 'job')}
          </span>
          <span>
            <i className={`fas ${tier.icon}`}></i> {tier.name}
          </span>
          {w.online ? (
            <span style={{ color: 'var(--st-good)', fontWeight: 700 }}>
              <i className="fas fa-circle" style={{ fontSize: '.55em', verticalAlign: 'middle' }}></i> Online
            </span>
          ) : (
            <span>
              <i className="far fa-circle" style={{ fontSize: '.55em', verticalAlign: 'middle' }}></i> Offline
            </span>
          )}
        </div>

        <div className="row gap-2 mt-4">
          <button
            className="btn btn-sm btn-outline flex1"
            onClick={() => setWorkerDrawer({ open: true, workerId: w.id, worker: w })}
          >
            View profile
          </button>
          <button
            className="btn btn-sm btn-primary flex1"
            onClick={() => openPostJob((w.skills || [])[0] || null)}
          >
            Post a job
          </button>
        </div>
      </div>
    );
  };

  return (
    <section id="view-client" className="view">
      <ClientHeader />

      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files && e.target.files[0];
          if (file) uploadAvatar('client', file);
          e.target.value = '';
        }}
      />

      {/* TAB 1: HOME */}
      {clientTab === 'home' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          {/* Greeting Hero Card */}
          <div
            className="card card-pad mb-6"
            style={{ background: 'linear-gradient(120deg, var(--brand) 0%, #1e3a8a 100%)', border: 0, color: '#fff' }}
          >
            <div className="spread wrap gap-4">
              <div>
                <h2 style={{ color: '#fff' }}>Hi {me.name.split(' ')[0]} 👋</h2>
                <p className="mt-2" style={{ color: '#c7dbff', maxWidth: '440px' }}>
                  Tell us what needs fixing and workers near you will send quotes within minutes.
                </p>
              </div>
              <div className="row gap-3">
                <button
                  className="btn btn-lg"
                  style={{ '--btn-bg': '#fff', '--btn-fg': '#1d4ed8', '--btn-bd': 'transparent' }}
                  onClick={() => openPostJob(null)}
                >
                  <i className="fas fa-plus"></i> Post a job
                </button>
                <button className="btn btn-lg btn-danger" onClick={sendSos}>
                  <i className="fas fa-tower-broadcast"></i> SOS
                </button>
              </div>
            </div>
          </div>

          {/* Needs Attention Strip */}
          {(needsAttentionJobs.length > 0 || runningJobs.length > 0) && (
            <div className="mb-6">
              <p className="eyebrow mb-3">Needs your attention</p>
              <div className="grid auto-fit">
                {needsAttentionJobs.slice(0, 3).map(j => {
                  const quotes = db.quotes.filter(q => q.jobId === j.id && q.status === 'Pending');
                  let label, cls, actionText, icon, onClickAction;

                  if (j.status === 'Pending') {
                    label = pluralise(quotes.length, 'new quote');
                    cls = 'badge-warn';
                    actionText = 'Compare quotes';
                    icon = 'fa-scale-unbalanced';
                    onClickAction = () => openOffers(j.id);
                  } else if (!j.confirmedAt) {
                    label = 'Work finished — confirm to pay';
                    cls = 'badge-good';
                    actionText = 'Confirm & pay';
                    icon = 'fa-circle-check';
                    onClickAction = () => confirmDone(j.id);
                  } else {
                    label = 'Leave a rating';
                    cls = 'badge-info';
                    actionText = 'Rate now';
                    icon = 'fa-star';
                    onClickAction = () => openRate(j.id);
                  }

                  return (
                    <div
                      key={j.id}
                      className="card card-pad card-hover"
                      style={{ borderLeft: '3px solid var(--brand)' }}
                    >
                      <span className={`badge ${cls}`}>{label}</span>
                      <p className="strong mt-2 clamp-2">{j.title}</p>
                      <p className="xs dim mt-1">{j.id} · {timeAgo(j.createdAt)}</p>
                      <button
                        className="btn btn-sm btn-primary mt-3 btn-block"
                        onClick={onClickAction}
                      >
                        <i className={`fas ${icon}`}></i> {actionText}
                      </button>
                    </div>
                  );
                })}

                {runningJobs.slice(0, 3 - Math.min(needsAttentionJobs.length, 3)).map(j => {
                  const worker = db.users.find(u => u.id === j.workerId);
                  return (
                    <div key={j.id} className="card card-pad card-hover">
                      <StatusBadge job={j} />
                      <p className="strong mt-2 clamp-2">{j.title}</p>
                      <div className="row gap-2 mt-2">
                        <Avatar user={worker} size="sm" />
                        <span className="xs dim">{worker?.name || 'Worker'} · {money(j.price)}</span>
                      </div>
                      <button
                        className="btn btn-sm btn-outline mt-3 btn-block"
                        onClick={() => setJobDrawer({ open: true, jobId: j.id })}
                      >
                        Open job
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories Grid */}
          <div className="spread mb-4">
            <div>
              <h3>What do you need?</h3>
              <p className="small muted">Pick a category to post a job in seconds.</p>
            </div>
            <div className="input-icon" style={{ maxWidth: '270px', width: '100%' }}>
              <i className="fas fa-magnifying-glass"></i>
              <input
                className="input"
                type="search"
                placeholder="Search services…"
                autoComplete="off"
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
              />
            </div>
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))' }}
          >
            {filteredCategories.length ? (
              filteredCategories.map(name => {
                const m = catMeta(name);
                const count = db.users.filter(
                  u => u.role === 'worker' && !u.suspended && u.city === me.city && (u.skills || []).includes(name)
                ).length;

                return (
                  <button
                    key={name}
                    className="cat-tile"
                    onClick={() => openPostJob(name)}
                  >
                    <span
                      className="c-ico"
                      style={{ background: `${m.color}1f`, color: m.color }}
                    >
                      <i className={`fas ${m.icon}`}></i>
                    </span>
                    <div className="c-name">{name}</div>
                    <div className="c-meta">
                      {count ? `${count} nearby` : 'none nearby'}
                    </div>
                  </button>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon="fa-magnifying-glass"
                  title="No matching service"
                  text="Try a different word, or post a job under the closest category."
                />
              </div>
            )}
          </div>

          {/* Top rated workers near you */}
          <div className="spread mt-8 mb-4">
            <div>
              <h3>Top rated near you</h3>
              <p className="small muted">Verified workers serving {me.city}.</p>
            </div>
            <button
              className="btn-link"
              onClick={() => setClientTab('workers')}
            >
              See all <i className="fas fa-arrow-right xs"></i>
            </button>
          </div>

          <div className="grid auto-fit-lg">
            {topWorkers.length ? (
              topWorkers.map(item => renderWorkerCard(item.u, item))
            ) : (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon="fa-user-slash"
                  title={`No verified workers in ${me.city} yet`}
                  text="You can still post a job — workers are notified the moment they join."
                />
              </div>
            )}
          </div>
        </main>
      )}

      {/* TAB 2: MY JOBS */}
      {clientTab === 'jobs' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          {/* KPI Stats */}
          <div className="grid g4 mb-6">
            <div className="stat stat-accent">
              <div className="stat-label">Total posted</div>
              <div className="stat-value">{st.total}</div>
              <div className="stat-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
            </div>

            <div className="stat">
              <div className="stat-label">Awaiting quotes</div>
              <div className="stat-value">{st.open}</div>
              <div className="stat-sub">
                {totalQuotesWaiting > 0 ? (
                  <>
                    <i className="fas fa-file-invoice-dollar"></i> {pluralise(totalQuotesWaiting, 'quote')} waiting
                  </>
                ) : (
                  'No quotes yet'
                )}
              </div>
              <div className="stat-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>
            </div>

            <div className="stat">
              <div className="stat-label">In progress</div>
              <div className="stat-value">{st.active}</div>
              <div className="stat-icon">
                <i className="fas fa-person-digging"></i>
              </div>
            </div>

            <div className="stat">
              <div className="stat-label">Total spent</div>
              <div className="stat-value">{money(st.spent)}</div>
              <div className="stat-sub">{pluralise(st.completed, 'job')} completed</div>
              <div className="stat-icon">
                <i className="fas fa-indian-rupee-sign"></i>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="spread wrap gap-3 mb-4">
            <div className="segmented">
              <button
                className={jobFilter === 'all' ? 'is-on' : ''}
                onClick={() => setJobFilter('all')}
              >
                All
              </button>
              <button
                className={jobFilter === 'open' ? 'is-on' : ''}
                onClick={() => setJobFilter('open')}
              >
                Quotes
              </button>
              <button
                className={jobFilter === 'active' ? 'is-on' : ''}
                onClick={() => setJobFilter('active')}
              >
                Active
              </button>
              <button
                className={jobFilter === 'Completed' ? 'is-on' : ''}
                onClick={() => setJobFilter('Completed')}
              >
                Completed
              </button>
              <button
                className={jobFilter === 'Cancelled' ? 'is-on' : ''}
                onClick={() => setJobFilter('Cancelled')}
              >
                Cancelled
              </button>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openPostJob(null)}
            >
              <i className="fas fa-plus"></i> New job
            </button>
          </div>

          {/* Jobs List */}
          <div className="col gap-4">
            {filteredJobs.length ? (
              filteredJobs.map(job => {
                const quotes = db.quotes.filter(q => q.jobId === job.id && q.status === 'Pending');
                const worker = job.workerId ? db.users.find(u => u.id === job.workerId) : null;
                const cheapest = quotes.length ? Math.min(...quotes.map(q => q.price)) : null;
                const isReviewed = db.reviews.some(r => r.jobId === job.id);
                const hasOpenDispute = db.disputes.some(d => d.jobId === job.id && d.status === 'Open');

                return (
                  <article
                    key={job.id}
                    className={`job-card ${job.urgent ? 'is-urgent' : ''}`}
                  >
                    <div className="jc-top">
                      <div className="flex1" style={{ minWidth: 0 }}>
                        <div className="row gap-2 wrap mb-2">
                          <StatusBadge job={job} />
                          <SkillChip skill={job.skill} />
                          {job.urgent && (
                            <span className="badge badge-critical">
                              <i className="fas fa-fire"></i> Urgent
                            </span>
                          )}
                        </div>
                        <h4 className="truncate">{job.title}</h4>
                        <p className="xs dim mt-1">
                          {job.id} · {job.area}, {job.city} · {timeAgo(job.createdAt)}
                        </p>
                      </div>
                      <div className="right shrink0">
                        {job.price ? (
                          <>
                            <div className="price-tag">{money(job.price)}</div>
                            <div className="xs dim">agreed</div>
                          </>
                        ) : job.budget ? (
                          <>
                            <div className="price-tag dim">{money(job.budget)}</div>
                            <div className="xs dim">your budget</div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="jc-body">
                      <p className="small muted clamp-2">{job.desc}</p>
                      {worker ? (
                        <div className="row gap-2 mt-3">
                          <Avatar user={worker} size="sm" />
                          <span className="small">{worker.name}</span>
                          {worker.verification === 'approved' && (
                            <i
                              className="fas fa-circle-check"
                              style={{ color: 'var(--brand)', fontSize: '.72rem' }}
                            />
                          )}
                        </div>
                      ) : quotes.length > 0 ? (
                        <div className="row gap-2 mt-3">
                          <div className="stack-avatars">
                            {quotes.slice(0, 4).map(q => {
                              const qWorker = db.users.find(u => u.id === q.workerId);
                              return (
                                <Avatar key={q.id} user={qWorker} size="sm" />
                              );
                            })}
                          </div>
                          <span className="small strong">
                            {pluralise(quotes.length, 'quote')} from {money(cheapest)}
                          </span>
                        </div>
                      ) : job.status === 'Pending' ? (
                        <p className="small dim mt-3">
                          <i className="fas fa-satellite-dish"></i> Waiting for the first quote…
                        </p>
                      ) : null}
                    </div>

                    <div className="jc-foot">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setJobDrawer({ open: true, jobId: job.id })}
                      >
                        <i className="fas fa-eye"></i> Details
                      </button>

                      {job.status === 'Pending' && (
                        <>
                          <button
                            className={`btn btn-sm ${quotes.length ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => openOffers(job.id)}
                            disabled={!quotes.length}
                          >
                            <i className="fas fa-scale-unbalanced"></i>{' '}
                            {quotes.length ? `Compare ${quotes.length} quote${quotes.length > 1 ? 's' : ''}` : 'No quotes yet'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => cancelJob(job.id)}
                          >
                            <i className="fas fa-ban"></i> Cancel
                          </button>
                        </>
                      )}

                      {job.workerId && ['Assigned', 'InProgress', 'Completed'].includes(job.status) && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openChat(job.id)}
                        >
                          <i className="fas fa-comment"></i> Message
                        </button>
                      )}

                      {['Assigned', 'InProgress'].includes(job.status) && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => cancelJob(job.id)}
                        >
                          <i className="fas fa-ban"></i> Cancel job
                        </button>
                      )}

                      {job.status === 'Completed' && !job.confirmedAt && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => confirmDone(job.id)}
                        >
                          <i className="fas fa-circle-check"></i> Confirm &amp; pay {money(job.price)}
                        </button>
                      )}

                      {job.status === 'Completed' && job.confirmedAt && !isReviewed && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openRate(job.id)}
                        >
                          <i className="fas fa-star"></i> Rate this job
                        </button>
                      )}

                      {job.workerId && job.status !== 'Cancelled' && !hasOpenDispute && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => openDispute(job.id)}
                        >
                          <i className="fas fa-flag"></i> Report an issue
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon="fa-clipboard-list"
                title={jobFilter === 'all' ? 'No jobs yet' : 'Nothing in this list'}
                text={
                  jobFilter === 'all'
                    ? 'Post your first job and workers nearby will start quoting within minutes.'
                    : 'Try another filter, or post a new job.'
                }
                action={
                  <button className="btn btn-primary" onClick={() => openPostJob(null)}>
                    <i className="fas fa-plus"></i> Post a job
                  </button>
                }
              />
            )}
          </div>
        </main>
      )}

      {/* TAB 3: FIND WORKERS */}
      {clientTab === 'workers' && (
        <main className="container" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
          <div className="spread wrap gap-3 mb-5">
            <div>
              <h3>Workers in {me.city}</h3>
              <p className="small muted">Browse who's available before you post.</p>
            </div>
            <div className="row gap-2 wrap">
              <select
                className="select"
                style={{ width: 'auto', minWidth: '150px' }}
                value={dirSkill}
                onChange={e => setDirSkill(e.target.value)}
              >
                <option value="all">All skills</option>
                {db.categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="select"
                style={{ width: 'auto' }}
                value={dirSort}
                onChange={e => setDirSort(e.target.value)}
              >
                <option value="rating">Top rated</option>
                <option value="jobs">Most jobs done</option>
                <option value="new">Newest</option>
              </select>

              <label className="checkline" style={{ whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={dirOnline}
                  onChange={e => setDirOnline(e.target.checked)}
                />{' '}
                Online now
              </label>
            </div>
          </div>

          <div className="grid auto-fit-lg">
            {dirWorkerRows.length ? (
              dirWorkerRows.map(item => renderWorkerCard(item.u, item))
            ) : (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon="fa-user-slash"
                  title="No workers match"
                  text="Loosen the filters, or post the job anyway — new workers see it the moment they join."
                />
              </div>
            )}
          </div>
        </main>
      )}

      {/* TAB 4: PROFILE */}
      {clientTab === 'profile' && (
        <main className="container container-sm" style={{ paddingBlock: 'var(--sp-6) var(--sp-12)' }}>
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
                  <p className="small muted">Client · {me.area}, {me.city}</p>
                  <div className="row gap-2 mt-2">
                    <span className="badge badge-brand">
                      <i className="fas fa-user"></i> Client account
                    </span>
                    <span className="badge badge-good">
                      <i className="fas fa-circle-check"></i> Active
                    </span>
                  </div>
                </div>
              </div>

              {!isEditingProfile ? (
                /* View Profile Mode */
                <div className="col gap-1">
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Phone</span>
                    <span className="small strong mono">+91 {me.phone}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">City</span>
                    <span className="small strong">{me.city}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Default area</span>
                    <span className="small strong">{me.area}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="small muted">Member since</span>
                    <span className="small strong">{dateStr(me.createdAt)}</span>
                  </div>
                  <div className="spread" style={{ padding: '11px 0' }}>
                    <span className="small muted">Jobs posted / completed</span>
                    <span className="small strong">{st.total} / {st.completed}</span>
                  </div>
                </div>
              ) : (
                /* Edit Profile Mode */
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
                      <label className="label">City</label>
                      <select
                        className="select"
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                      >
                        <option value="" disabled>Select a city</option>
                        {db.cities.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="label">Default area</label>
                      <input
                        className="input"
                        value={editArea}
                        onChange={e => setEditArea(e.target.value)}
                      />
                    </div>
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
                  onClick={() => logout('client')}
                >
                  <i className="fas fa-right-from-bracket"></i> Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h4>Danger zone</h4>
            </div>
            <div className="card-body spread wrap gap-3">
              <div>
                <p className="strong small">Delete this account</p>
                <p className="xs muted">
                  Removes your profile. Jobs you posted stay in the platform record as "removed user".
                </p>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => deleteAccount('client')}
              >
                Delete account
              </button>
            </div>
          </div>
        </main>
      )}
    </section>
  );
}

